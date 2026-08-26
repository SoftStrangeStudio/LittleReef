import * as THREE from 'three';

function cubicPoint(points, amount) {
  const inverse = 1 - amount;
  return points[0].clone().multiplyScalar(inverse ** 3)
    .add(points[1].clone().multiplyScalar(3 * inverse ** 2 * amount))
    .add(points[2].clone().multiplyScalar(3 * inverse * amount ** 2))
    .add(points[3].clone().multiplyScalar(amount ** 3));
}

function cubicTangent(points, amount) {
  const inverse = 1 - amount;
  return points[1].clone().sub(points[0]).multiplyScalar(3 * inverse ** 2)
    .add(points[2].clone().sub(points[1]).multiplyScalar(6 * inverse * amount))
    .add(points[3].clone().sub(points[2]).multiplyScalar(3 * amount ** 2));
}

function direction(x, y) {
  return new THREE.Vector2(x, y).normalize();
}

function makeSegment(start, startDirection, startHandle, end, endDirection, endHandle) {
  return [
    start.clone(),
    start.clone().addScaledVector(startDirection, startHandle),
    end.clone().addScaledVector(endDirection, -endHandle),
    end.clone(),
  ];
}

function approximateLength(segment, subdivisions = 24) {
  let length = 0;
  let previous = cubicPoint(segment, 0);
  for (let index = 1; index <= subdivisions; index += 1) {
    const point = cubicPoint(segment, index / subdivisions);
    length += point.distanceTo(previous);
    previous = point;
  }
  return length;
}

export function createSymmetricArchPath(parameters) {
  const halfSpan = parameters.span * 0.5;
  const knots = [
    new THREE.Vector2(-halfSpan, parameters.baseY),
    new THREE.Vector2(-halfSpan + parameters.baseLean, parameters.baseY + parameters.height * parameters.baseRise),
    new THREE.Vector2(-parameters.apexApproach, parameters.baseY + parameters.height * parameters.shoulderRise),
    new THREE.Vector2(0, parameters.baseY + parameters.height),
  ];
  const baseDirection = new THREE.Vector2(0, 1);
  const pillarDirection = direction(parameters.pillarTangentX, parameters.pillarTangentY);
  const shoulderDirection = direction(parameters.shoulderTangentX, parameters.shoulderTangentY);
  const apexDirection = new THREE.Vector2(1, 0);
  const segments = [
    makeSegment(knots[0], baseDirection, parameters.baseHandle, knots[1], pillarDirection, parameters.footExitHandle),
    makeSegment(knots[1], pillarDirection, parameters.pillarEntryHandle, knots[2], shoulderDirection, parameters.pillarExitHandle),
    makeSegment(knots[2], shoulderDirection, parameters.crownEntryHandle, knots[3], apexDirection, parameters.apexHandle),
  ];
  const lengths = segments.map((segment) => approximateLength(segment));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const boundaries = [0];
  for (const length of lengths) boundaries.push(boundaries.at(-1) + length / totalLength);

  const sampleLeft = (halfCoordinate) => {
    const coordinate = THREE.MathUtils.clamp(halfCoordinate, 0, 1);
    let segmentIndex = segments.length - 1;
    for (let index = 0; index < segments.length; index += 1) {
      if (coordinate <= boundaries[index + 1]) {
        segmentIndex = index;
        break;
      }
    }
    const start = boundaries[segmentIndex];
    const end = boundaries[segmentIndex + 1];
    const local = end === start ? 0 : (coordinate - start) / (end - start);
    return {
      point: cubicPoint(segments[segmentIndex], local),
      tangent: cubicTangent(segments[segmentIndex], local).normalize(),
    };
  };

  const sample = (amount) => {
    if (Math.abs(amount - 0.5) < 1e-10) {
      return { point: knots[3].clone(), tangent: new THREE.Vector2(1, 0), halfCoordinate: 1 };
    }
    const leftSide = amount < 0.5;
    const halfCoordinate = leftSide ? amount * 2 : (1 - amount) * 2;
    const result = sampleLeft(halfCoordinate);
    if (!leftSide) {
      result.point.x *= -1;
      result.tangent.y *= -1;
    }
    return { ...result, halfCoordinate };
  };

  return {
    sample,
    controlPoints: segments.flatMap((segment, index) => segment
      .filter((_, pointIndex) => index === 0 || pointIndex > 0)
      .map((point) => [point.x, point.y])),
    segmentBoundaries: boundaries,
  };
}

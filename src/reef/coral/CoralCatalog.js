export const CORAL_CATALOG = Object.freeze([
  { id: '01', name: 'Staghorn Crown', file: '01-staghorn-crown.glb', seed: 11031, triangles: 1008, bounds: [2.4262, 3.2, 1.3332], defaultScale: 0.4, floorOffset: 0, checksum: 'dcdd988f5c84abde4bce4c17d7fdba94c901ab6b4f1978b332e3d9aabee6091a', obstacleProxies: [{ offset: [0, 1.35, 0], radius: 0.58 }] },
  { id: '02', name: 'Elkhorn Grove', file: '02-elkhorn-grove.glb', seed: 22063, triangles: 924, bounds: [2.4527, 3.2, 0.4032], defaultScale: 0.4, floorOffset: 0, checksum: 'b0d909d96e18f4025abcb2a82afd4218a3841beb19d4f80d7bef1da565f48e03', obstacleProxies: [{ offset: [0, 1.25, 0], radius: 0.52 }] },
  { id: '03', name: 'Brain Coral', file: '03-brain-coral.glb', seed: 33097, triangles: 2196, bounds: [3, 1.9558, 2.4107], defaultScale: 0.46, floorOffset: 0, checksum: 'e1a3483d975ec566ce733ba06a93367898f117ab22ff827aade628f36ca00ab6', obstacleProxies: [{ offset: [0, 0.72, 0], radius: 0.88 }] },
  { id: '04', name: 'Pillar Colony', file: '04-pillar-colony.glb', seed: 44131, triangles: 1040, bounds: [3.2, 2.9811, 1.6201], defaultScale: 0.39, floorOffset: 0, checksum: '26696d3ff2c1af91147b45375786d731a31c16dc4d723c94b4ecb684c81464d6', obstacleProxies: [{ offset: [0, 1.1, 0], radius: 0.65 }] },
  { id: '05', name: 'Lettuce Coral', file: '05-lettuce-coral.glb', seed: 55169, triangles: 1008, bounds: [3.1, 1.1266, 3.0988], defaultScale: 0.43, floorOffset: 0, checksum: '673971a0e7f7e76f451d4a7e06a1ceb76fd17919c26778f49089f8620bcc3abc', obstacleProxies: [{ offset: [0, 0.35, 0], radius: 0.9 }] },
  { id: '06', name: 'Sea Fan', file: '06-sea-fan.glb', seed: 66203, triangles: 868, bounds: [3.25, 2.7045, 0.157], defaultScale: 0.4, floorOffset: 0, checksum: 'a2c849ae2567047e6fa7aed42233015081c4e3d867da389d036083c3aff86ef7', obstacleProxies: [{ offset: [0, 1.05, 0], radius: 0.48 }] },
  { id: '07', name: 'Sea Rod Garden', file: '07-sea-rod-garden.glb', seed: 77239, triangles: 1680, bounds: [3.063, 3.2, 2.4129], defaultScale: 0.38, floorOffset: 0, checksum: '3f798df4457958b051295b81e6a6f33414b803d2df1b1d528021ee5627e10cec', obstacleProxies: [{ offset: [0, 1.2, 0], radius: 0.72 }] },
  { id: '08', name: 'Table Coral', file: '08-table-coral.glb', seed: 88277, triangles: 632, bounds: [3.2164, 1.4856, 3.25], defaultScale: 0.43, floorOffset: 0, checksum: 'c2b2b515843eb2110d70c37ba3e1ba945f8090ed08f80a024d81403f4e78fb1e', obstacleProxies: [{ offset: [0, 0.54, 0], radius: 0.88 }] },
  { id: '09', name: 'Tube Colony', file: '09-tube-colony.glb', seed: 99317, triangles: 1022, bounds: [3.15, 2.1865, 1.7912], defaultScale: 0.43, floorOffset: 0, checksum: '5725a0c57892b07082c6b23ee3089941f0e55a1370385dba3a7b90a7911913ee', obstacleProxies: [{ offset: [0, 0.8, 0], radius: 0.65 }] },
  { id: '10', name: 'Mixed Reef Cluster', file: '10-mixed-reef-cluster.glb', seed: 110357, triangles: 4884, bounds: [3.25, 2.1785, 1.5985], defaultScale: 0.42, floorOffset: 0, checksum: '3353a086aaa17992a9df2c35c98f15aba3abf14d751516930104f62e1a23e099', obstacleProxies: [{ offset: [0, 0.78, 0], radius: 0.72 }] },
]);

export const CORAL_BY_ID = new Map(CORAL_CATALOG.map((entry) => [entry.id, entry]));

export function coralEntries(ids) {
  return ids.map((id) => {
    const entry = CORAL_BY_ID.get(id);
    if (!entry) throw new RangeError(`Unknown coral asset: ${id}`);
    return entry;
  });
}

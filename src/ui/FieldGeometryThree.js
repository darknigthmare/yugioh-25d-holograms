import { Group, Mesh, InstancedMesh, Vector3, Matrix3, Color,
  MeshStandardMaterial, BoxGeometry, DodecahedronGeometry, ConeGeometry,
  CylinderGeometry, IcosahedronGeometry, TorusGeometry, SphereGeometry,
  BufferGeometry, Float32BufferAttribute, DoubleSide } from 'three';

// Both the duel and atlas use the same bounded constructor set. Passing the
// whole Three namespace into a factory prevents the renderer's tree shaking.
export const FIELD_GEOMETRY_THREE = Object.freeze({ Group, Mesh, InstancedMesh,
  Vector3, Matrix3, Color, MeshStandardMaterial, BoxGeometry,
  DodecahedronGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry,
  TorusGeometry, SphereGeometry, BufferGeometry, Float32BufferAttribute, DoubleSide });

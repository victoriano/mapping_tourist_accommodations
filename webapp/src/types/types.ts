// GeoJSON Types
export interface Point {
  type: 'Point';
  coordinates: [number, number];
}

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export type Geometry = Point | MultiPolygon | Polygon;

export interface Feature {
  type: 'Feature';
  geometry: Geometry;
  properties: SectionProperties;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

// Census Section Properties
export interface SectionProperties {
  CUSEC: string;
  CUMUN: string;
  CSEC: string;
  CDIS: string;
  CMUN: string;
  CPRO: string;
  CCA: string;
  CUDIS: string;
  CLAU2: string;
  NPRO: string;
  NCA: string;
  CNUT0: string;
  CNUT1: string;
  CNUT2: string;
  CNUT3: string;
  NMUN: string;
  'Shape_Leng': number;
  'Shape_Area': number;
  'Nivel': string;
  'NOTA1': string;
  'vivienda turistica': number;
  'unidad1': string;
  'nota2': string;
  'plazas': number;
  'unidad2': string;
  'nota3': string;
  'plazas por vivienda turistica': number;
  'unidad3': string;
  'nota4': string;
  'Porcentaje vivienda turistica': number;
  'UNIDAD4': string;
  'PERIODO': string;
  'PROV': string;
  'PROV_LITERAL': string;
  'MUN': string;
  'MUN_LITERAL': string;
}

// Filter Options
export interface FilterOptions {
  minAccommodations: number;
  maxAccommodations: number;
  province: string;
  municipality: string;
}

// Province and Municipality for UI
export interface Province {
  code: string;
  name: string;
}

export interface Municipality {
  code: string;
  name: string;
  provinceCode: string;
} 
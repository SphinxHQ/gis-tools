/**
 * @file GIS projected coordinate bounds
 * @description Defines CRS information interfaces and a comprehensive registry of Chinese CRS
 *              bounds (CGCS2000, Xian80, Beijing54 Gauss-Kruger zones) with envelope and
 *              projection metadata for OpenLayers reprojection support.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
/**
 * CRS (Coordinate Reference System) information interface
 */
export interface CrsInfo {
    /** Whether this is a projected coordinate system */
    projected: boolean;
    /** Coordinate envelope bounds */
    envelope: {
        /** North bound */
        top: number;
        // 西
        left: number;
        // 南
        bottom: number;
        // 东
        right: number;
    };
    // 最小经度
    minLon: number;
    // 最大经度
    maxLon: number;
    // 是否带有带号
    withZone: boolean;
    // 分带度数
    zoneDegree?: number; // 如果没有分带需求，该字段可以省略
    // 坐标系 JSON 描述
    crs: {
        type: 'name'; // 更具体地定义类型
        properties: {
            name: string;
        };
    };
    // EPSG 代码
    epsgCode: number;
    // 带号
    zoneNumber?: number; // 如果没有分带需求，该字段可以省略
    // 坐标系名称
    name: string;
    // 中央经线
    centralMeridian: number; // 可以通过 minLon 和 maxLon 计算得出
}


export class GisCrsInfo implements CrsInfo {
    centralMeridian: number;
    crs: { type: 'name'; properties: { name: string } };
    envelope: { top: number; left: number; bottom: number; right: number };
    epsgCode: number;
    maxLon: number;
    minLon: number;
    name: string;
    projected: boolean;
    withZone: boolean;
    zoneDegree?: number;
    zoneNumber?: number;
    constructor(conf:CrsInfo) {
        this.centralMeridian = conf.centralMeridian;
        this.crs = conf.crs;
        this.envelope = conf.envelope;
        this.epsgCode = conf.epsgCode;
        this.maxLon = conf.maxLon;
        this.minLon = conf.minLon;
        this.name = conf.name;
        this.projected = conf.projected;
        this.withZone = conf.withZone;
        this.zoneDegree = conf.zoneDegree;
        this.zoneNumber = conf.zoneNumber;
    }
}
export const CrsBounds: { [key: string]: GisCrsInfo } = {
    "EPSG:4214": new GisCrsInfo({
        "projected": false,
        "envelope": {"top": 53.56, "left": 73.62, "bottom": 16.7, "right": 134.77},
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": -1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4214"}},
        "epsgCode": 4214,
        "zoneNumber": -1,
        "name": "Beijing 1954",
        "centralMeridian": 104.19500000000001,
        "maxLon": 134.77
    }),
    "EPSG:4326": new GisCrsInfo({
        "projected": false,
        "envelope": {"top": 90.0, "left": -180.0, "bottom": -90.0, "right": 180.0},
        "minLon": -180.0,
        "withZone": false,
        "zoneDegree": -1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "epsgCode": 4326,
        "zoneNumber": -1,
        "name": "WGS 84",
        "centralMeridian": 0.0,
        "maxLon": 180.0
    }),
    "EPSG:3857": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 20048966.104014594,
            "left": -20037508.342789244,
            "bottom": -20048966.1040146,
            "right": 20037508.342789244
        },
        "minLon": -180.0,
        "withZone": false,
        "zoneDegree": 360,
        "crs": {"type": "name", "properties": {"name": "EPSG:3857"}},
        "epsgCode": 3857,
        "zoneNumber": 1,
        "name": "WGS 84 / Pseudo-Mercator",
        "centralMeridian": 0.0,
        "maxLon": 180.0
    }),
    "EPSG:2349": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4502789.6994732395,
            "left": 25375272.43796543,
            "bottom": 3964464.304250063,
            "right": 25635574.19370056
        },
        "minLon": 73.62,
        "withZone": true,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:2349"}},
        "epsgCode": 2349,
        "zoneNumber": 37,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 25",
        "centralMeridian": 75.06,
        "maxLon": 76.5
    }),
    "EPSG:2350": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4633844.8230278175,
            "left": 26356780.682329576,
            "bottom": 3434302.015579684,
            "right": 26643219.317670424
        },
        "minLon": 76.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2350"}},
        "epsgCode": 2350,
        "zoneNumber": 26,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 26",
        "centralMeridian": 78.0,
        "maxLon": 79.5
    }),
    "EPSG:2351": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5083859.2938811155,
            "left": 27355189.655774225,
            "bottom": 3314572.351855428,
            "right": 27645775.85907376
        },
        "minLon": 79.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2351"}},
        "epsgCode": 2351,
        "zoneNumber": 27,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 27",
        "centralMeridian": 81.005,
        "maxLon": 82.51
    }),
    "EPSG:2352": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5233910.910307751,
            "left": 28352803.435920756,
            "bottom": 3127256.8076938847,
            "right": 28647196.564079247
        },
        "minLon": 82.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2352"}},
        "epsgCode": 2352,
        "zoneNumber": 28,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 28",
        "centralMeridian": 84.0,
        "maxLon": 85.5
    }),
    "EPSG:2353": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5450731.68373525,
            "left": 29352176.007370967,
            "bottom": 3076279.6124139414,
            "right": 29647823.992629033
        },
        "minLon": 85.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2353"}},
        "epsgCode": 2353,
        "zoneNumber": 29,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 29",
        "centralMeridian": 87.0,
        "maxLon": 88.5
    }),
    "EPSG:2354": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5366233.5362554705,
            "left": 30350541.52663369,
            "bottom": 3023089.637176264,
            "right": 30649458.47336631
        },
        "minLon": 88.49,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2354"}},
        "epsgCode": 2354,
        "zoneNumber": 30,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 30",
        "centralMeridian": 90.0,
        "maxLon": 91.51
    }),
    "EPSG:2355": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5000488.840254253,
            "left": 31352054.3619545,
            "bottom": 3066306.2117088023,
            "right": 31647945.63804549
        },
        "minLon": 91.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2355"}},
        "epsgCode": 2355,
        "zoneNumber": 31,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 31",
        "centralMeridian": 93.0,
        "maxLon": 94.5
    }),
    "EPSG:2356": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4930492.51899175,
            "left": 32352762.22722971,
            "bottom": 3123932.113883729,
            "right": 32648219.48398028
        },
        "minLon": 94.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2356"}},
        "epsgCode": 2356,
        "zoneNumber": 32,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 32",
        "centralMeridian": 96.005,
        "maxLon": 97.51
    }),
    "EPSG:2357": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4737151.761249983,
            "left": 33344482.250383984,
            "bottom": 2370687.5028953278,
            "right": 33655517.74961603
        },
        "minLon": 97.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2357"}},
        "epsgCode": 2357,
        "zoneNumber": 33,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 33",
        "centralMeridian": 99.0,
        "maxLon": 100.5
    }),
    "EPSG:2358": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4729375.424777833,
            "left": 34344166.49731509,
            "bottom": 2337471.2810933716,
            "right": 34655833.50268491
        },
        "minLon": 100.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2358"}},
        "epsgCode": 2358,
        "zoneNumber": 34,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 34",
        "centralMeridian": 102.0,
        "maxLon": 103.5
    }),
    "EPSG:2359": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4676054.367634811,
            "left": 35345642.99844867,
            "bottom": 2489168.4703369453,
            "right": 35654357.00155133
        },
        "minLon": 103.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2359"}},
        "epsgCode": 2359,
        "zoneNumber": 35,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 35",
        "centralMeridian": 105.0,
        "maxLon": 106.5
    }),
    "EPSG:2360": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4704936.088613724,
            "left": 36341298.75337099,
            "bottom": 2012012.3519824676,
            "right": 36658701.24662901
        },
        "minLon": 106.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2360"}},
        "epsgCode": 2360,
        "zoneNumber": 36,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 36",
        "centralMeridian": 108.0,
        "maxLon": 109.5
    }),
    "EPSG:2361": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4998266.158811829,
            "left": 37341226.5056799,
            "bottom": 2003157.7793557788,
            "right": 37658773.4943201
        },
        "minLon": 109.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2361"}},
        "epsgCode": 2361,
        "zoneNumber": 37,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 37",
        "centralMeridian": 111.0,
        "maxLon": 112.5
    }),
    "EPSG:2362": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5036052.733892059,
            "left": 38344577.80565379,
            "bottom": 2380652.600679543,
            "right": 38655422.19434621
        },
        "minLon": 112.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2362"}},
        "epsgCode": 2362,
        "zoneNumber": 38,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 38",
        "centralMeridian": 114.0,
        "maxLon": 115.5
    }),
    "EPSG:2363": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5528581.54008064,
            "left": 39345754.22911344,
            "bottom": 2500242.2523405463,
            "right": 39654245.77088656
        },
        "minLon": 115.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2363"}},
        "epsgCode": 2363,
        "zoneNumber": 39,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 39",
        "centralMeridian": 117.0,
        "maxLon": 118.5
    }),
    "EPSG:2364": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5912397.962314682,
            "left": 40347872.175081395,
            "bottom": 2702917.2881435016,
            "right": 40652127.824918605
        },
        "minLon": 118.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2364"}},
        "epsgCode": 2364,
        "zoneNumber": 40,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 40",
        "centralMeridian": 120.0,
        "maxLon": 121.5
    }),
    "EPSG:2365": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5937993.196410389,
            "left": 41352748.49996298,
            "bottom": 3122823.872351677,
            "right": 41647251.50003704
        },
        "minLon": 121.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2365"}},
        "epsgCode": 2365,
        "zoneNumber": 41,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 41",
        "centralMeridian": 123.0,
        "maxLon": 124.5
    }),
    "EPSG:2366": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5897931.499920357,
            "left": 42372262.4066465,
            "bottom": 4450628.033473073,
            "right": 42627737.5933535
        },
        "minLon": 124.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2366"}},
        "epsgCode": 2366,
        "zoneNumber": 42,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 42",
        "centralMeridian": 126.0,
        "maxLon": 127.5
    }),
    "EPSG:2367": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5569734.309276779,
            "left": 43374503.705447815,
            "bottom": 4581666.698386992,
            "right": 43625496.29455219
        },
        "minLon": 127.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2367"}},
        "epsgCode": 2367,
        "zoneNumber": 43,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 43",
        "centralMeridian": 129.0,
        "maxLon": 130.5
    }),
    "EPSG:2368": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5417370.163320534,
            "left": 44376543.07256441,
            "bottom": 4698291.564249092,
            "right": 44623456.9274356
        },
        "minLon": 130.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2368"}},
        "epsgCode": 2368,
        "zoneNumber": 44,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 44",
        "centralMeridian": 132.0,
        "maxLon": 133.5
    }),
    "EPSG:2369": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5363995.112773979,
            "left": 45383491.788134225,
            "bottom": 5079441.547062159,
            "right": 45482969.266651206
        },
        "minLon": 133.5,
        "withZone": true,
        "zoneDegree": 1,
        "crs": {"type": "name", "properties": {"name": "EPSG:2369"}},
        "epsgCode": 2369,
        "zoneNumber": 132,
        "name": "Xian 1980 / 3-degree Gauss-Kruger zone 45",
        "centralMeridian": 134.135,
        "maxLon": 134.77
    }),
    "EPSG:2370": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4502789.6994732395,
            "left": 375272.4379654293,
            "bottom": 3964464.304250063,
            "right": 635574.1937005611
        },
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:2370"}},
        "epsgCode": 2370,
        "zoneNumber": 37,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 75E",
        "centralMeridian": 75.06,
        "maxLon": 76.5
    }),
    "EPSG:2371": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4633844.8230278175,
            "left": 356780.6823295752,
            "bottom": 3434302.015579684,
            "right": 643219.3176704224
        },
        "minLon": 76.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2371"}},
        "epsgCode": 2371,
        "zoneNumber": 26,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 78E",
        "centralMeridian": 78.0,
        "maxLon": 79.5
    }),
    "EPSG:2372": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5083859.2938811155,
            "left": 355189.65577422455,
            "bottom": 3314572.351855428,
            "right": 645775.8590737623
        },
        "minLon": 79.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2372"}},
        "epsgCode": 2372,
        "zoneNumber": 27,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 81E",
        "centralMeridian": 81.005,
        "maxLon": 82.51
    }),
    "EPSG:2373": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5233910.910307751,
            "left": 352803.4359207539,
            "bottom": 3127256.8076938847,
            "right": 647196.5640792449
        },
        "minLon": 82.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2373"}},
        "epsgCode": 2373,
        "zoneNumber": 28,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 84E",
        "centralMeridian": 84.0,
        "maxLon": 85.5
    }),
    "EPSG:2374": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5450731.68373525,
            "left": 352176.0073709674,
            "bottom": 3076279.6124139414,
            "right": 647823.9926290326
        },
        "minLon": 85.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2374"}},
        "epsgCode": 2374,
        "zoneNumber": 29,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 87E",
        "centralMeridian": 87.0,
        "maxLon": 88.5
    }),
    "EPSG:2375": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5366233.5362554705,
            "left": 350541.52663369104,
            "bottom": 3023089.637176264,
            "right": 649458.473366309
        },
        "minLon": 88.49,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2375"}},
        "epsgCode": 2375,
        "zoneNumber": 30,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 90E",
        "centralMeridian": 90.0,
        "maxLon": 91.51
    }),
    "EPSG:2376": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5000488.840254253,
            "left": 352054.3619545038,
            "bottom": 3066306.2117088023,
            "right": 647945.6380454949
        },
        "minLon": 91.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2376"}},
        "epsgCode": 2376,
        "zoneNumber": 31,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 93E",
        "centralMeridian": 93.0,
        "maxLon": 94.5
    }),
    "EPSG:2377": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4930492.51899175,
            "left": 352762.22722971166,
            "bottom": 3123932.113883729,
            "right": 648219.4839802792
        },
        "minLon": 94.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2377"}},
        "epsgCode": 2377,
        "zoneNumber": 32,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 96E",
        "centralMeridian": 96.005,
        "maxLon": 97.51
    }),
    "EPSG:2378": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4737151.761249983,
            "left": 344482.2503839794,
            "bottom": 2370687.5028953278,
            "right": 655517.7496160179
        },
        "minLon": 97.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2378"}},
        "epsgCode": 2378,
        "zoneNumber": 33,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 99E",
        "centralMeridian": 99.0,
        "maxLon": 100.5
    }),
    "EPSG:2379": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4729375.424777833,
            "left": 344166.4973150897,
            "bottom": 2337471.2810933716,
            "right": 655833.5026849117
        },
        "minLon": 100.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2379"}},
        "epsgCode": 2379,
        "zoneNumber": 34,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 102E",
        "centralMeridian": 102.0,
        "maxLon": 103.5
    }),
    "EPSG:2380": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4676054.367634811,
            "left": 345642.99844866863,
            "bottom": 2489168.4703369453,
            "right": 654357.0015513287
        },
        "minLon": 103.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2380"}},
        "epsgCode": 2380,
        "zoneNumber": 35,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 105E",
        "centralMeridian": 105.0,
        "maxLon": 106.5
    }),
    "EPSG:2381": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4704936.088613724,
            "left": 341298.7533709959,
            "bottom": 2012012.3519824676,
            "right": 658701.2466290041
        },
        "minLon": 106.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2381"}},
        "epsgCode": 2381,
        "zoneNumber": 36,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 108E",
        "centralMeridian": 108.0,
        "maxLon": 109.5
    }),
    "EPSG:2382": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4998266.158811829,
            "left": 341226.50567989633,
            "bottom": 2003157.7793557788,
            "right": 658773.4943201024
        },
        "minLon": 109.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2382"}},
        "epsgCode": 2382,
        "zoneNumber": 37,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 111E",
        "centralMeridian": 111.0,
        "maxLon": 112.5
    }),
    "EPSG:2383": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5036052.733892059,
            "left": 344577.8056537898,
            "bottom": 2380652.600679543,
            "right": 655422.1943462129
        },
        "minLon": 112.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2383"}},
        "epsgCode": 2383,
        "zoneNumber": 38,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 114E",
        "centralMeridian": 114.0,
        "maxLon": 115.5
    }),
    "EPSG:2384": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5528581.54008064,
            "left": 345754.2291134366,
            "bottom": 2500242.2523405463,
            "right": 654245.770886566
        },
        "minLon": 115.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2384"}},
        "epsgCode": 2384,
        "zoneNumber": 39,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 117E",
        "centralMeridian": 117.0,
        "maxLon": 118.5
    }),
    "EPSG:2385": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5912397.962314682,
            "left": 347872.1750813979,
            "bottom": 2702917.2881435016,
            "right": 652127.8249186047
        },
        "minLon": 118.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2385"}},
        "epsgCode": 2385,
        "zoneNumber": 40,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 120E",
        "centralMeridian": 120.0,
        "maxLon": 121.5
    }),
    "EPSG:2386": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5937993.196410389,
            "left": 352748.49996296945,
            "bottom": 3122823.872351677,
            "right": 647251.500037028
        },
        "minLon": 121.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2386"}},
        "epsgCode": 2386,
        "zoneNumber": 41,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 123E",
        "centralMeridian": 123.0,
        "maxLon": 124.5
    }),
    "EPSG:2387": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5897931.499920357,
            "left": 372262.40664649964,
            "bottom": 4450628.033473073,
            "right": 627737.5933535004
        },
        "minLon": 124.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2387"}},
        "epsgCode": 2387,
        "zoneNumber": 42,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 126E",
        "centralMeridian": 126.0,
        "maxLon": 127.5
    }),
    "EPSG:2388": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5569734.309276779,
            "left": 374503.7054478124,
            "bottom": 4581666.698386992,
            "right": 625496.2945521898
        },
        "minLon": 127.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2388"}},
        "epsgCode": 2388,
        "zoneNumber": 43,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 129E",
        "centralMeridian": 129.0,
        "maxLon": 130.5
    }),
    "EPSG:2389": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5417370.163320534,
            "left": 376543.0725644061,
            "bottom": 4698291.564249092,
            "right": 623456.9274355981
        },
        "minLon": 130.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2389"}},
        "epsgCode": 2389,
        "zoneNumber": 44,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 132E",
        "centralMeridian": 132.0,
        "maxLon": 133.5
    }),
    "EPSG:2390": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5363995.112773979,
            "left": 383491.78813422925,
            "bottom": 5079441.547062159,
            "right": 482969.26665121224
        },
        "minLon": 133.5,
        "withZone": false,
        "zoneDegree": 1,
        "crs": {"type": "name", "properties": {"name": "EPSG:2390"}},
        "epsgCode": 2390,
        "zoneNumber": 132,
        "name": "Xian 1980 / 3-degree Gauss-Kruger CM 135E",
        "centralMeridian": 134.135,
        "maxLon": 134.77
    }),
    "EPSG:2327": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4552717.34226728,
            "left": 13374665.346331302,
            "bottom": 3921228.046908133,
            "right": 13773407.721842501
        },
        "minLon": 73.62,
        "withZone": true,
        "zoneDegree": 4,
        "crs": {"type": "name", "properties": {"name": "EPSG:2327"}},
        "epsgCode": 2327,
        "zoneNumber": 19,
        "name": "Xian 1980 / Gauss-Kruger zone 13",
        "centralMeridian": 75.815,
        "maxLon": 78.01
    }),
    "EPSG:2328": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5237245.646603286,
            "left": 14206116.69388272,
            "bottom": 3227004.802586689,
            "right": 14791936.115266943
        },
        "minLon": 77.98,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2328"}},
        "epsgCode": 2328,
        "zoneNumber": 14,
        "name": "Xian 1980 / Gauss-Kruger zone 14",
        "centralMeridian": 80.99000000000001,
        "maxLon": 84.0
    }),
    "EPSG:2329": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5453983.173959235,
            "left": 15203003.585035145,
            "bottom": 3023089.637176264,
            "right": 15796996.414964857
        },
        "minLon": 84.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2329"}},
        "epsgCode": 2329,
        "zoneNumber": 15,
        "name": "Xian 1980 / Gauss-Kruger zone 15",
        "centralMeridian": 87.0,
        "maxLon": 90.0
    }),
    "EPSG:2330": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5311699.123990218,
            "left": 16204050.756440029,
            "bottom": 3066306.221713862,
            "right": 16796936.25888947
        },
        "minLon": 90.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2330"}},
        "epsgCode": 2330,
        "zoneNumber": 16,
        "name": "Xian 1980 / Gauss-Kruger zone 16",
        "centralMeridian": 93.005,
        "maxLon": 96.01
    }),
    "EPSG:2331": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4787120.079605267,
            "left": 17188253.37610482,
            "bottom": 2337471.2892630976,
            "right": 17812786.490748033
        },
        "minLon": 96.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2331"}},
        "epsgCode": 2331,
        "zoneNumber": 17,
        "name": "Xian 1980 / Gauss-Kruger zone 17",
        "centralMeridian": 99.005,
        "maxLon": 102.01
    }),
    "EPSG:2332": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4708209.070141181,
            "left": 18189098.505544327,
            "bottom": 2381759.8403881504,
            "right": 18810901.494455673
        },
        "minLon": 102.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2332"}},
        "epsgCode": 2332,
        "zoneNumber": 18,
        "name": "Xian 1980 / Gauss-Kruger zone 18",
        "centralMeridian": 105.0,
        "maxLon": 108.0
    }),
    "EPSG:2333": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5001552.167033467,
            "left": 19182364.581043437,
            "bottom": 2003157.7793557788,
            "right": 19817635.418956563
        },
        "minLon": 108.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2333"}},
        "epsgCode": 2333,
        "zoneNumber": 19,
        "name": "Xian 1980 / Gauss-Kruger zone 19",
        "centralMeridian": 111.0,
        "maxLon": 114.0
    }),
    "EPSG:2334": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5714208.919258713,
            "left": 20190416.422514286,
            "bottom": 2449303.9890527464,
            "right": 20809583.57748571
        },
        "minLon": 114.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2334"}},
        "epsgCode": 2334,
        "zoneNumber": 20,
        "name": "Xian 1980 / Gauss-Kruger zone 20",
        "centralMeridian": 117.0,
        "maxLon": 120.0
    }),
    "EPSG:2335": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5941134.37017406,
            "left": 21200433.018732578,
            "bottom": 2914504.7359624607,
            "right": 21799566.98126742
        },
        "minLon": 120.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2335"}},
        "epsgCode": 2335,
        "zoneNumber": 21,
        "name": "Xian 1980 / Gauss-Kruger zone 21",
        "centralMeridian": 123.0,
        "maxLon": 126.0
    }),
    "EPSG:2336": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5855474.418453461,
            "left": 22247158.4322901,
            "bottom": 4528359.590622214,
            "right": 22752841.5677099
        },
        "minLon": 126.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2336"}},
        "epsgCode": 2336,
        "zoneNumber": 22,
        "name": "Xian 1980 / Gauss-Kruger zone 22",
        "centralMeridian": 129.0,
        "maxLon": 132.0
    }),
    "EPSG:2337": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5367258.334098418,
            "left": 23263541.62729162,
            "bottom": 4987195.082827349,
            "right": 23482969.266651213
        },
        "minLon": 132.0,
        "withZone": true,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:2337"}},
        "epsgCode": 2337,
        "zoneNumber": 66,
        "name": "Xian 1980 / Gauss-Kruger zone 23",
        "centralMeridian": 133.385,
        "maxLon": 134.77
    }),
    "EPSG:2338": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4552717.34226728,
            "left": 374665.3463313013,
            "bottom": 3921228.046908133,
            "right": 773407.7218425013
        },
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": 4,
        "crs": {"type": "name", "properties": {"name": "EPSG:2338"}},
        "epsgCode": 2338,
        "zoneNumber": 19,
        "name": "Xian 1980 / Gauss-Kruger CM 75E",
        "centralMeridian": 75.815,
        "maxLon": 78.01
    }),
    "EPSG:2339": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5237245.646603286,
            "left": 206116.69388271822,
            "bottom": 3227004.802586689,
            "right": 791936.115266941
        },
        "minLon": 77.98,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2339"}},
        "epsgCode": 2339,
        "zoneNumber": 14,
        "name": "Xian 1980 / Gauss-Kruger CM 81E",
        "centralMeridian": 80.99000000000001,
        "maxLon": 84.0
    }),
    "EPSG:2340": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5453983.173959235,
            "left": 203003.5850351454,
            "bottom": 3023089.637176264,
            "right": 796996.4149648559
        },
        "minLon": 84.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2340"}},
        "epsgCode": 2340,
        "zoneNumber": 15,
        "name": "Xian 1980 / Gauss-Kruger CM 87E",
        "centralMeridian": 87.0,
        "maxLon": 90.0
    }),
    "EPSG:2341": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5311699.123990218,
            "left": 204050.75644002814,
            "bottom": 3066306.221713862,
            "right": 796936.2588894705
        },
        "minLon": 90.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2341"}},
        "epsgCode": 2341,
        "zoneNumber": 16,
        "name": "Xian 1980 / Gauss-Kruger CM 93E",
        "centralMeridian": 93.005,
        "maxLon": 96.01
    }),
    "EPSG:2342": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4787120.079605267,
            "left": 188253.37610481912,
            "bottom": 2337471.2892630976,
            "right": 812786.4907480322
        },
        "minLon": 96.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2342"}},
        "epsgCode": 2342,
        "zoneNumber": 17,
        "name": "Xian 1980 / Gauss-Kruger CM 99E",
        "centralMeridian": 99.005,
        "maxLon": 102.01
    }),
    "EPSG:2343": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4708209.070141181,
            "left": 189098.50554432574,
            "bottom": 2381759.8403881504,
            "right": 810901.4944556716
        },
        "minLon": 102.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2343"}},
        "epsgCode": 2343,
        "zoneNumber": 18,
        "name": "Xian 1980 / Gauss-Kruger CM 105E",
        "centralMeridian": 105.0,
        "maxLon": 108.0
    }),
    "EPSG:2344": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5001552.167033467,
            "left": 182364.58104343666,
            "bottom": 2003157.7793557788,
            "right": 817635.418956562
        },
        "minLon": 108.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2344"}},
        "epsgCode": 2344,
        "zoneNumber": 19,
        "name": "Xian 1980 / Gauss-Kruger CM 111E",
        "centralMeridian": 111.0,
        "maxLon": 114.0
    }),
    "EPSG:2345": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5714208.919258713,
            "left": 190416.4225142873,
            "bottom": 2449303.9890527464,
            "right": 809583.5774857113
        },
        "minLon": 114.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2345"}},
        "epsgCode": 2345,
        "zoneNumber": 20,
        "name": "Xian 1980 / Gauss-Kruger CM 117E",
        "centralMeridian": 117.0,
        "maxLon": 120.0
    }),
    "EPSG:2346": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5941134.37017406,
            "left": 200433.0187325785,
            "bottom": 2914504.7359624607,
            "right": 799566.981267419
        },
        "minLon": 120.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2346"}},
        "epsgCode": 2346,
        "zoneNumber": 21,
        "name": "Xian 1980 / Gauss-Kruger CM 123E",
        "centralMeridian": 123.0,
        "maxLon": 126.0
    }),
    "EPSG:2347": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5855474.418453461,
            "left": 247158.4322900997,
            "bottom": 4528359.590622214,
            "right": 752841.5677099003
        },
        "minLon": 126.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:2347"}},
        "epsgCode": 2347,
        "zoneNumber": 22,
        "name": "Xian 1980 / Gauss-Kruger CM 129E",
        "centralMeridian": 129.0,
        "maxLon": 132.0
    }),
    "EPSG:2348": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5367258.334098418,
            "left": 263541.6272916205,
            "bottom": 4987195.082827349,
            "right": 482969.26665121224
        },
        "minLon": 132.0,
        "withZone": false,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:2348"}},
        "epsgCode": 2348,
        "zoneNumber": 66,
        "name": "Xian 1980 / Gauss-Kruger CM 135E",
        "centralMeridian": 133.385,
        "maxLon": 134.77
    }),
    "EPSG:2401": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4502867.202884016,
            "left": 25375270.405260935,
            "bottom": 3964532.7228261023,
            "right": 25635576.403173298
        },
        "minLon": 73.62,
        "withZone": true,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:2401"}},
        "epsgCode": 2401,
        "zoneNumber": 37,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 25",
        "centralMeridian": 75.06,
        "maxLon": 76.5
    }),
    "EPSG:2402": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4633924.528483744,
            "left": 26356778.342957754,
            "bottom": 3434361.4252351364,
            "right": 26643221.657042246
        },
        "minLon": 76.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2402"}},
        "epsgCode": 2402,
        "zoneNumber": 26,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 26",
        "centralMeridian": 78.0,
        "maxLon": 79.5
    }),
    "EPSG:2403": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5083946.530920342,
            "left": 27355187.289260995,
            "bottom": 3314629.718961877,
            "right": 27645778.241365463
        },
        "minLon": 79.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2403"}},
        "epsgCode": 2403,
        "zoneNumber": 27,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 27",
        "centralMeridian": 81.005,
        "maxLon": 82.51
    }),
    "EPSG:2404": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5234000.648391519,
            "left": 28352801.028629143,
            "bottom": 3127310.973603344,
            "right": 28647198.971370865
        },
        "minLon": 82.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2404"}},
        "epsgCode": 2404,
        "zoneNumber": 28,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 28",
        "centralMeridian": 84.0,
        "maxLon": 85.5
    }),
    "EPSG:2405": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5450825.02670319,
            "left": 29352173.58934271,
            "bottom": 3076332.9059630157,
            "right": 29647826.41065729
        },
        "minLon": 85.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2405"}},
        "epsgCode": 2405,
        "zoneNumber": 29,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 29",
        "centralMeridian": 87.0,
        "maxLon": 88.5
    }),
    "EPSG:2406": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5366325.475611275,
            "left": 30350539.08137357,
            "bottom": 3023142.019976512,
            "right": 30649460.91862643
        },
        "minLon": 88.49,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2406"}},
        "epsgCode": 2406,
        "zoneNumber": 30,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 30",
        "centralMeridian": 90.0,
        "maxLon": 91.51
    }),
    "EPSG:2407": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5000574.685473289,
            "left": 31352051.94184393,
            "bottom": 3066359.3345280755,
            "right": 31647948.058156062
        },
        "minLon": 91.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2407"}},
        "epsgCode": 2407,
        "zoneNumber": 31,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 31",
        "centralMeridian": 93.0,
        "maxLon": 94.5
    }),
    "EPSG:2408": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4930577.194424712,
            "left": 32352759.819233112,
            "bottom": 3123986.2229135265,
            "right": 32648221.908032116
        },
        "minLon": 94.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2408"}},
        "epsgCode": 2408,
        "zoneNumber": 32,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 32",
        "centralMeridian": 96.005,
        "maxLon": 97.51
    }),
    "EPSG:2409": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4737233.199767577,
            "left": 33344479.700198285,
            "bottom": 2370728.674103986,
            "right": 33655520.29980172
        },
        "minLon": 97.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2409"}},
        "epsgCode": 2409,
        "zoneNumber": 33,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 33",
        "centralMeridian": 99.0,
        "maxLon": 100.5
    }),
    "EPSG:2410": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4729456.73292526,
            "left": 34344163.94168546,
            "bottom": 2337511.8795927805,
            "right": 34655836.05831454
        },
        "minLon": 100.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2410"}},
        "epsgCode": 2410,
        "zoneNumber": 34,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 34",
        "centralMeridian": 102.0,
        "maxLon": 103.5
    }),
    "EPSG:2411": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4676134.781484848,
            "left": 35345640.468261674,
            "bottom": 2489211.682968877,
            "right": 35654359.531738326
        },
        "minLon": 103.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2411"}},
        "epsgCode": 2411,
        "zoneNumber": 35,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 35",
        "centralMeridian": 105.0,
        "maxLon": 106.5
    }),
    "EPSG:2412": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4705016.986946439,
            "left": 36341296.14822385,
            "bottom": 2012047.330319512,
            "right": 36658703.85177615
        },
        "minLon": 106.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2412"}},
        "epsgCode": 2412,
        "zoneNumber": 36,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 36",
        "centralMeridian": 108.0,
        "maxLon": 109.5
    }),
    "EPSG:2413": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4998351.966902607,
            "left": 37341223.89928349,
            "bottom": 2003192.6045791283,
            "right": 37658776.1007165
        },
        "minLon": 109.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2413"}},
        "epsgCode": 2413,
        "zoneNumber": 37,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 37",
        "centralMeridian": 111.0,
        "maxLon": 112.5
    }),
    "EPSG:2414": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5036139.173026277,
            "left": 38344575.25711525,
            "bottom": 2380693.9436716544,
            "right": 38655424.742884755
        },
        "minLon": 112.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2414"}},
        "epsgCode": 2414,
        "zoneNumber": 38,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 38",
        "centralMeridian": 114.0,
        "maxLon": 115.5
    }),
    "EPSG:2415": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5528676.174790442,
            "left": 39345751.70084171,
            "bottom": 2500285.6556589534,
            "right": 39654248.2991583
        },
        "minLon": 115.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2415"}},
        "epsgCode": 2415,
        "zoneNumber": 39,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 39",
        "centralMeridian": 117.0,
        "maxLon": 118.5
    }),
    "EPSG:2416": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5912498.945763696,
            "left": 40347869.6832406,
            "bottom": 2702964.1778752934,
            "right": 40652130.3167594
        },
        "minLon": 118.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2416"}},
        "epsgCode": 2416,
        "zoneNumber": 40,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 40",
        "centralMeridian": 120.0,
        "maxLon": 121.5
    }),
    "EPSG:2417": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5938094.6020734925,
            "left": 41352746.09173153,
            "bottom": 3122877.9624209544,
            "right": 41647253.90826848
        },
        "minLon": 121.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2417"}},
        "epsgCode": 2417,
        "zoneNumber": 41,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 41",
        "centralMeridian": 123.0,
        "maxLon": 124.5
    }),
    "EPSG:2418": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5898032.24466994,
            "left": 42372260.32946952,
            "bottom": 4450704.659973694,
            "right": 42627739.67053048
        },
        "minLon": 124.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2418"}},
        "epsgCode": 2418,
        "zoneNumber": 42,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 42",
        "centralMeridian": 126.0,
        "maxLon": 127.5
    }),
    "EPSG:2419": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5569829.626271695,
            "left": 43374501.665955365,
            "bottom": 4581745.5281843925,
            "right": 43625498.334044635
        },
        "minLon": 127.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2419"}},
        "epsgCode": 2419,
        "zoneNumber": 43,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 43",
        "centralMeridian": 129.0,
        "maxLon": 130.5
    }),
    "EPSG:2420": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5417462.952310595,
            "left": 44376541.06730415,
            "bottom": 4698372.351716806,
            "right": 44623458.93269586
        },
        "minLon": 130.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:2420"}},
        "epsgCode": 2420,
        "zoneNumber": 44,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 44",
        "centralMeridian": 132.0,
        "maxLon": 133.5
    }),
    "EPSG:2421": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5364087.014931382,
            "left": 45383489.89911637,
            "bottom": 5079528.710900883,
            "right": 45482968.99088784
        },
        "minLon": 133.5,
        "withZone": true,
        "zoneDegree": 1,
        "crs": {"type": "name", "properties": {"name": "EPSG:2421"}},
        "epsgCode": 2421,
        "zoneNumber": 132,
        "name": "Beijing 1954 / 3-degree Gauss-Kruger zone 45",
        "centralMeridian": 134.135,
        "maxLon": 134.77
    }),
    "EPSG:4513": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4502787.598997963,
            "left": 25375272.496738378,
            "bottom": 3964462.4558294336,
            "right": 25635574.12981656
        },
        "minLon": 73.62,
        "withZone": true,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:4513"}},
        "epsgCode": 4513,
        "zoneNumber": 37,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 25",
        "centralMeridian": 75.06,
        "maxLon": 76.5
    }),
    "EPSG:4514": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4633842.661140055,
            "left": 26356780.749788634,
            "bottom": 3434300.415072082,
            "right": 26643219.250211366
        },
        "minLon": 76.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4514"}},
        "epsgCode": 4514,
        "zoneNumber": 26,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 26",
        "centralMeridian": 78.0,
        "maxLon": 79.5
    }),
    "EPSG:4515": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5083856.920962672,
            "left": 27355189.72397673,
            "bottom": 3314570.807294095,
            "right": 27645775.79041652
        },
        "minLon": 79.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4515"}},
        "epsgCode": 4515,
        "zoneNumber": 27,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 27",
        "centralMeridian": 81.005,
        "maxLon": 82.51
    }),
    "EPSG:4516": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5233908.46697077,
            "left": 28352803.50523791,
            "bottom": 3127255.35063057,
            "right": 28647196.494762093
        },
        "minLon": 82.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4516"}},
        "epsgCode": 4516,
        "zoneNumber": 28,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 28",
        "centralMeridian": 84.0,
        "maxLon": 85.5
    }),
    "EPSG:4517": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5450729.13859846,
            "left": 29352176.07698113,
            "bottom": 3076278.1791568417,
            "right": 29647823.92301887
        },
        "minLon": 85.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4517"}},
        "epsgCode": 4517,
        "zoneNumber": 29,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 29",
        "centralMeridian": 87.0,
        "maxLon": 88.5
    }),
    "EPSG:4518": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5366231.03079804,
            "left": 30350541.59701097,
            "bottom": 3023088.2287560483,
            "right": 30649458.40298903
        },
        "minLon": 88.49,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4518"}},
        "epsgCode": 4518,
        "zoneNumber": 30,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 30",
        "centralMeridian": 90.0,
        "maxLon": 91.51
    }),
    "EPSG:4519": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5000486.506449765,
            "left": 31352054.43162147,
            "bottom": 3066304.7831089585,
            "right": 31647945.568378523
        },
        "minLon": 91.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4519"}},
        "epsgCode": 4519,
        "zoneNumber": 31,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 31",
        "centralMeridian": 93.0,
        "maxLon": 94.5
    }),
    "EPSG:4520": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4930490.218020228,
            "left": 32352762.29656611,
            "bottom": 3123930.658373115,
            "right": 32648219.414181575
        },
        "minLon": 94.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4520"}},
        "epsgCode": 4520,
        "zoneNumber": 32,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 32",
        "centralMeridian": 96.005,
        "maxLon": 97.51
    }),
    "EPSG:4521": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4737149.5509383585,
            "left": 33344482.32358455,
            "bottom": 2370686.3989014025,
            "right": 33655517.67641546
        },
        "minLon": 97.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4521"}},
        "epsgCode": 4521,
        "zoneNumber": 33,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 33",
        "centralMeridian": 99.0,
        "maxLon": 100.5
    }),
    "EPSG:4522": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4729373.218111707,
            "left": 34344166.5706629,
            "bottom": 2337470.1925891824,
            "right": 34655833.4293371
        },
        "minLon": 100.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4522"}},
        "epsgCode": 4522,
        "zoneNumber": 34,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 34",
        "centralMeridian": 102.0,
        "maxLon": 103.5
    }),
    "EPSG:4523": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4676052.185963357,
            "left": 35345643.071107864,
            "bottom": 2489167.3110844586,
            "right": 35654356.92889213
        },
        "minLon": 103.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4523"}},
        "epsgCode": 4523,
        "zoneNumber": 35,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 35",
        "centralMeridian": 105.0,
        "maxLon": 106.5
    }),
    "EPSG:4524": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4704933.893404148,
            "left": 36341298.828055754,
            "bottom": 2012011.4152050265,
            "right": 36658701.171944246
        },
        "minLon": 106.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4524"}},
        "epsgCode": 4524,
        "zoneNumber": 36,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 36",
        "centralMeridian": 108.0,
        "maxLon": 109.5
    }),
    "EPSG:4525": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4998263.826050016,
            "left": 37341226.58039832,
            "bottom": 2003156.8467051992,
            "right": 37658773.41960167
        },
        "minLon": 109.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4525"}},
        "epsgCode": 4525,
        "zoneNumber": 37,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 37",
        "centralMeridian": 111.0,
        "maxLon": 112.5
    }),
    "EPSG:4526": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5036050.383403487,
            "left": 38344577.878809795,
            "bottom": 2380651.492038416,
            "right": 38655422.12119021
        },
        "minLon": 112.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4526"}},
        "epsgCode": 4526,
        "zoneNumber": 38,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 38",
        "centralMeridian": 114.0,
        "maxLon": 115.5
    }),
    "EPSG:4527": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5528578.958379041,
            "left": 39345754.30172075,
            "bottom": 2500241.0879227463,
            "right": 39654245.698279254
        },
        "minLon": 115.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4527"}},
        "epsgCode": 4527,
        "zoneNumber": 39,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 39",
        "centralMeridian": 117.0,
        "maxLon": 118.5
    }),
    "EPSG:4528": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5912395.200238359,
            "left": 40347872.2467006,
            "bottom": 2702916.029170417,
            "right": 40652127.7532994
        },
        "minLon": 118.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4528"}},
        "epsgCode": 4528,
        "zoneNumber": 40,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 40",
        "centralMeridian": 120.0,
        "maxLon": 121.5
    }),
    "EPSG:4529": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5937990.422299586,
            "left": 41352748.569305785,
            "bottom": 3122822.4173586327,
            "right": 41647251.43069422
        },
        "minLon": 121.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4529"}},
        "epsgCode": 4529,
        "zoneNumber": 41,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 41",
        "centralMeridian": 123.0,
        "maxLon": 124.5
    }),
    "EPSG:4530": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5897928.744645611,
            "left": 42372262.46686148,
            "bottom": 4450625.957438363,
            "right": 42627737.53313852
        },
        "minLon": 124.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4530"}},
        "epsgCode": 4530,
        "zoneNumber": 42,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 42",
        "centralMeridian": 126.0,
        "maxLon": 127.5
    }),
    "EPSG:4531": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5569731.708243546,
            "left": 43374503.764612645,
            "bottom": 4581664.560955403,
            "right": 43625496.235387355
        },
        "minLon": 127.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4531"}},
        "epsgCode": 4531,
        "zoneNumber": 43,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 43",
        "centralMeridian": 129.0,
        "maxLon": 130.5
    }),
    "EPSG:4532": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5417367.633850942,
            "left": 44376543.13077342,
            "bottom": 4698289.372157168,
            "right": 44623456.86922659
        },
        "minLon": 130.5,
        "withZone": true,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4532"}},
        "epsgCode": 4532,
        "zoneNumber": 44,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 44",
        "centralMeridian": 132.0,
        "maxLon": 133.5
    }),
    "EPSG:4533": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5363992.608367607,
            "left": 45383491.84308441,
            "bottom": 5079439.176219185,
            "right": 45482969.27468551
        },
        "minLon": 133.5,
        "withZone": true,
        "zoneDegree": 1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4533"}},
        "epsgCode": 4533,
        "zoneNumber": 132,
        "name": "CGCS2000 / 3-degree Gauss-Kruger zone 45",
        "centralMeridian": 134.135,
        "maxLon": 134.77
    }),
    "EPSG:4534": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4502787.598997963,
            "left": 375272.4967383775,
            "bottom": 3964462.4558294336,
            "right": 635574.1298165598
        },
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:4534"}},
        "epsgCode": 4534,
        "zoneNumber": 37,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 75E",
        "centralMeridian": 75.06,
        "maxLon": 76.5
    }),
    "EPSG:4535": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4633842.661140055,
            "left": 356780.7497886336,
            "bottom": 3434300.415072082,
            "right": 643219.2502113639
        },
        "minLon": 76.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4535"}},
        "epsgCode": 4535,
        "zoneNumber": 26,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 78E",
        "centralMeridian": 78.0,
        "maxLon": 79.5
    }),
    "EPSG:4536": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5083856.920962672,
            "left": 355189.72397672955,
            "bottom": 3314570.807294095,
            "right": 645775.7904165203
        },
        "minLon": 79.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4536"}},
        "epsgCode": 4536,
        "zoneNumber": 27,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 81E",
        "centralMeridian": 81.005,
        "maxLon": 82.51
    }),
    "EPSG:4537": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5233908.46697077,
            "left": 352803.50523790874,
            "bottom": 3127255.35063057,
            "right": 647196.49476209
        },
        "minLon": 82.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4537"}},
        "epsgCode": 4537,
        "zoneNumber": 28,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 84E",
        "centralMeridian": 84.0,
        "maxLon": 85.5
    }),
    "EPSG:4538": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5450729.13859846,
            "left": 352176.07698113157,
            "bottom": 3076278.1791568417,
            "right": 647823.9230188684
        },
        "minLon": 85.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4538"}},
        "epsgCode": 4538,
        "zoneNumber": 29,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 87E",
        "centralMeridian": 87.0,
        "maxLon": 88.5
    }),
    "EPSG:4539": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5366231.03079804,
            "left": 350541.59701096895,
            "bottom": 3023088.2287560483,
            "right": 649458.402989031
        },
        "minLon": 88.49,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4539"}},
        "epsgCode": 4539,
        "zoneNumber": 30,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 90E",
        "centralMeridian": 90.0,
        "maxLon": 91.51
    }),
    "EPSG:4540": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5000486.506449765,
            "left": 352054.43162147293,
            "bottom": 3066304.7831089585,
            "right": 647945.5683785258
        },
        "minLon": 91.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4540"}},
        "epsgCode": 4540,
        "zoneNumber": 31,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 93E",
        "centralMeridian": 93.0,
        "maxLon": 94.5
    }),
    "EPSG:4541": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4930490.218020228,
            "left": 352762.29656611185,
            "bottom": 3123930.658373115,
            "right": 648219.4141815762
        },
        "minLon": 94.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4541"}},
        "epsgCode": 4541,
        "zoneNumber": 32,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 96E",
        "centralMeridian": 96.005,
        "maxLon": 97.51
    }),
    "EPSG:4542": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4737149.5509383585,
            "left": 344482.32358454546,
            "bottom": 2370686.3989014025,
            "right": 655517.6764154519
        },
        "minLon": 97.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4542"}},
        "epsgCode": 4542,
        "zoneNumber": 33,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 99E",
        "centralMeridian": 99.0,
        "maxLon": 100.5
    }),
    "EPSG:4543": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4729373.218111707,
            "left": 344166.5706629022,
            "bottom": 2337470.1925891824,
            "right": 655833.4293370992
        },
        "minLon": 100.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4543"}},
        "epsgCode": 4543,
        "zoneNumber": 34,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 102E",
        "centralMeridian": 102.0,
        "maxLon": 103.5
    }),
    "EPSG:4544": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4676052.185963357,
            "left": 345643.0711078663,
            "bottom": 2489167.3110844586,
            "right": 654356.9288921311
        },
        "minLon": 103.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4544"}},
        "epsgCode": 4544,
        "zoneNumber": 35,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 105E",
        "centralMeridian": 105.0,
        "maxLon": 106.5
    }),
    "EPSG:4545": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4704933.893404148,
            "left": 341298.82805575134,
            "bottom": 2012011.4152050265,
            "right": 658701.1719442487
        },
        "minLon": 106.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4545"}},
        "epsgCode": 4545,
        "zoneNumber": 36,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 108E",
        "centralMeridian": 108.0,
        "maxLon": 109.5
    }),
    "EPSG:4546": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4998263.826050016,
            "left": 341226.5803983246,
            "bottom": 2003156.8467051992,
            "right": 658773.4196016741
        },
        "minLon": 109.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4546"}},
        "epsgCode": 4546,
        "zoneNumber": 37,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 111E",
        "centralMeridian": 111.0,
        "maxLon": 112.5
    }),
    "EPSG:4547": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5036050.383403487,
            "left": 344577.87880979344,
            "bottom": 2380651.492038416,
            "right": 655422.1211902092
        },
        "minLon": 112.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4547"}},
        "epsgCode": 4547,
        "zoneNumber": 38,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 114E",
        "centralMeridian": 114.0,
        "maxLon": 115.5
    }),
    "EPSG:4548": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5528578.958379041,
            "left": 345754.30172075075,
            "bottom": 2500241.0879227463,
            "right": 654245.6982792518
        },
        "minLon": 115.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4548"}},
        "epsgCode": 4548,
        "zoneNumber": 39,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 117E",
        "centralMeridian": 117.0,
        "maxLon": 118.5
    }),
    "EPSG:4549": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5912395.200238359,
            "left": 347872.24670060317,
            "bottom": 2702916.029170417,
            "right": 652127.7532993995
        },
        "minLon": 118.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4549"}},
        "epsgCode": 4549,
        "zoneNumber": 40,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 120E",
        "centralMeridian": 120.0,
        "maxLon": 121.5
    }),
    "EPSG:4550": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5937990.422299586,
            "left": 352748.56930578063,
            "bottom": 3122822.4173586327,
            "right": 647251.4306942169
        },
        "minLon": 121.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4550"}},
        "epsgCode": 4550,
        "zoneNumber": 41,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 123E",
        "centralMeridian": 123.0,
        "maxLon": 124.5
    }),
    "EPSG:4551": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5897928.744645611,
            "left": 372262.4668614785,
            "bottom": 4450625.957438363,
            "right": 627737.5331385215
        },
        "minLon": 124.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4551"}},
        "epsgCode": 4551,
        "zoneNumber": 42,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 126E",
        "centralMeridian": 126.0,
        "maxLon": 127.5
    }),
    "EPSG:4552": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5569731.708243546,
            "left": 374503.7646126483,
            "bottom": 4581664.560955403,
            "right": 625496.2353873539
        },
        "minLon": 127.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4552"}},
        "epsgCode": 4552,
        "zoneNumber": 43,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 129E",
        "centralMeridian": 129.0,
        "maxLon": 130.5
    }),
    "EPSG:4553": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5417367.633850942,
            "left": 376543.1307734173,
            "bottom": 4698289.372157168,
            "right": 623456.8692265869
        },
        "minLon": 130.5,
        "withZone": false,
        "zoneDegree": 3,
        "crs": {"type": "name", "properties": {"name": "EPSG:4553"}},
        "epsgCode": 4553,
        "zoneNumber": 44,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 132E",
        "centralMeridian": 132.0,
        "maxLon": 133.5
    }),
    "EPSG:4554": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5363992.608367607,
            "left": 383491.84308441967,
            "bottom": 5079439.176219185,
            "right": 482969.27468551655
        },
        "minLon": 133.5,
        "withZone": false,
        "zoneDegree": 1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4554"}},
        "epsgCode": 4554,
        "zoneNumber": 132,
        "name": "CGCS2000 / 3-degree Gauss-Kruger CM 135E",
        "centralMeridian": 134.135,
        "maxLon": 134.77
    }),
    "EPSG:4491": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4552715.218388874,
            "left": 13374665.4053883,
            "bottom": 3921226.218716924,
            "right": 13773407.59301407
        },
        "minLon": 73.62,
        "withZone": true,
        "zoneDegree": 4,
        "crs": {"type": "name", "properties": {"name": "EPSG:4491"}},
        "epsgCode": 4491,
        "zoneNumber": 19,
        "name": "CGCS2000 / Gauss-Kruger zone 13",
        "centralMeridian": 75.815,
        "maxLon": 78.01
    }),
    "EPSG:4492": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5237243.201693293,
            "left": 14206116.832286952,
            "bottom": 3227003.2989339065,
            "right": 14791935.977779744
        },
        "minLon": 77.98,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4492"}},
        "epsgCode": 4492,
        "zoneNumber": 14,
        "name": "CGCS2000 / Gauss-Kruger zone 14",
        "centralMeridian": 80.99000000000001,
        "maxLon": 84.0
    }),
    "EPSG:4493": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5453980.627288425,
            "left": 15203003.724885676,
            "bottom": 3023088.2287560483,
            "right": 15796996.275114326
        },
        "minLon": 84.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4493"}},
        "epsgCode": 4493,
        "zoneNumber": 15,
        "name": "CGCS2000 / Gauss-Kruger zone 15",
        "centralMeridian": 87.0,
        "maxLon": 90.0
    }),
    "EPSG:4494": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5311696.644129676,
            "left": 16204050.895801578,
            "bottom": 3066304.7931140135,
            "right": 16796936.119063135
        },
        "minLon": 90.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4494"}},
        "epsgCode": 4494,
        "zoneNumber": 16,
        "name": "CGCS2000 / Gauss-Kruger zone 16",
        "centralMeridian": 93.005,
        "maxLon": 96.01
    }),
    "EPSG:4495": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4787117.845858258,
            "left": 17188253.522838328,
            "bottom": 2337470.200758904,
            "right": 17812786.343525074
        },
        "minLon": 96.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4495"}},
        "epsgCode": 4495,
        "zoneNumber": 17,
        "name": "CGCS2000 / Gauss-Kruger zone 17",
        "centralMeridian": 99.005,
        "maxLon": 102.01
    }),
    "EPSG:4496": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4708206.8733884,
            "left": 18181721.149025593,
            "bottom": 1963312.1927666694,
            "right": 18818278.850974403
        },
        "minLon": 102.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4496"}},
        "epsgCode": 4496,
        "zoneNumber": 18,
        "name": "CGCS2000 / Gauss-Kruger zone 18",
        "centralMeridian": 105.0,
        "maxLon": 108.0
    }),
    "EPSG:4497": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5001549.832721932,
            "left": 19179915.672897276,
            "bottom": 1847106.8672085009,
            "right": 19820084.32710272
        },
        "minLon": 108.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4497"}},
        "epsgCode": 4497,
        "zoneNumber": 19,
        "name": "CGCS2000 / Gauss-Kruger zone 19",
        "centralMeridian": 111.0,
        "maxLon": 114.0
    }),
    "EPSG:4498": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5714206.250336335,
            "left": 20184047.248447325,
            "bottom": 2103881.962779923,
            "right": 20815952.751552675
        },
        "minLon": 114.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4498"}},
        "epsgCode": 4498,
        "zoneNumber": 20,
        "name": "CGCS2000 / Gauss-Kruger zone 20",
        "centralMeridian": 117.0,
        "maxLon": 120.0
    }),
    "EPSG:4499": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5941131.594580701,
            "left": 21196182.07563383,
            "bottom": 2726176.8914866513,
            "right": 21803817.924366165
        },
        "minLon": 120.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4499"}},
        "epsgCode": 4499,
        "zoneNumber": 21,
        "name": "CGCS2000 / Gauss-Kruger zone 21",
        "centralMeridian": 123.0,
        "maxLon": 126.0
    }),
    "EPSG:4500": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5855471.683133215,
            "left": 22209606.468764935,
            "bottom": 3286858.4219365153,
            "right": 22790393.531235065
        },
        "minLon": 126.0,
        "withZone": true,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4500"}},
        "epsgCode": 4500,
        "zoneNumber": 22,
        "name": "CGCS2000 / Gauss-Kruger zone 22",
        "centralMeridian": 129.0,
        "maxLon": 132.0
    }),
    "EPSG:4501": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5367255.828152603,
            "left": 23263541.738806892,
            "bottom": 4987192.7552616615,
            "right": 23482969.274685517
        },
        "minLon": 132.0,
        "withZone": true,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:4501"}},
        "epsgCode": 4501,
        "zoneNumber": 66,
        "name": "CGCS2000 / Gauss-Kruger zone 23",
        "centralMeridian": 133.385,
        "maxLon": 134.77
    }),
    "EPSG:4502": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4552715.218388874,
            "left": 374665.40538829897,
            "bottom": 3921226.218716924,
            "right": 773407.5930140701
        },
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": 4,
        "crs": {"type": "name", "properties": {"name": "EPSG:4502"}},
        "epsgCode": 4502,
        "zoneNumber": 19,
        "name": "CGCS2000 / Gauss-Kruger CM 75E",
        "centralMeridian": 75.815,
        "maxLon": 78.01
    }),
    "EPSG:4503": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5237243.201693293,
            "left": 206116.83228695055,
            "bottom": 3227003.2989339065,
            "right": 791935.9777797428
        },
        "minLon": 77.98,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4503"}},
        "epsgCode": 4503,
        "zoneNumber": 14,
        "name": "CGCS2000 / Gauss-Kruger CM 81E",
        "centralMeridian": 80.99000000000001,
        "maxLon": 84.0
    }),
    "EPSG:4504": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5453980.627288425,
            "left": 203003.72488567617,
            "bottom": 3023088.2287560483,
            "right": 796996.2751143251
        },
        "minLon": 84.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4504"}},
        "epsgCode": 4504,
        "zoneNumber": 15,
        "name": "CGCS2000 / Gauss-Kruger CM 87E",
        "centralMeridian": 87.0,
        "maxLon": 90.0
    }),
    "EPSG:4505": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5311696.644129676,
            "left": 204050.89580157708,
            "bottom": 3066304.7931140135,
            "right": 796936.1190631363
        },
        "minLon": 90.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4505"}},
        "epsgCode": 4505,
        "zoneNumber": 16,
        "name": "CGCS2000 / Gauss-Kruger CM 93E",
        "centralMeridian": 93.005,
        "maxLon": 96.01
    }),
    "EPSG:4506": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4787117.845858258,
            "left": 188253.52283832722,
            "bottom": 2337470.200758904,
            "right": 812786.343525074
        },
        "minLon": 96.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4506"}},
        "epsgCode": 4506,
        "zoneNumber": 17,
        "name": "CGCS2000 / Gauss-Kruger CM 99E",
        "centralMeridian": 99.005,
        "maxLon": 102.01
    }),
    "EPSG:4507": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 4708206.8733884,
            "left": 181721.14902559225,
            "bottom": 1963312.1927666694,
            "right": 818278.8509744051
        },
        "minLon": 102.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4507"}},
        "epsgCode": 4507,
        "zoneNumber": 18,
        "name": "CGCS2000 / Gauss-Kruger CM 105E",
        "centralMeridian": 105.0,
        "maxLon": 108.0
    }),
    "EPSG:4508": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5001549.832721932,
            "left": 179915.67289727717,
            "bottom": 1847106.8672085009,
            "right": 820084.3271027214
        },
        "minLon": 108.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4508"}},
        "epsgCode": 4508,
        "zoneNumber": 19,
        "name": "CGCS2000 / Gauss-Kruger CM 111E",
        "centralMeridian": 111.0,
        "maxLon": 114.0
    }),
    "EPSG:4509": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5714206.250336335,
            "left": 184047.2484473238,
            "bottom": 2103881.962779923,
            "right": 815952.7515526749
        },
        "minLon": 114.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4509"}},
        "epsgCode": 4509,
        "zoneNumber": 20,
        "name": "CGCS2000 / Gauss-Kruger CM 117E",
        "centralMeridian": 117.0,
        "maxLon": 120.0
    }),
    "EPSG:4510": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5941131.594580701,
            "left": 196182.0756338325,
            "bottom": 2726176.8914866513,
            "right": 803817.924366165
        },
        "minLon": 120.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4510"}},
        "epsgCode": 4510,
        "zoneNumber": 21,
        "name": "CGCS2000 / Gauss-Kruger CM 123E",
        "centralMeridian": 123.0,
        "maxLon": 126.0
    }),
    "EPSG:4511": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5855471.683133215,
            "left": 209606.46876493288,
            "bottom": 3286858.4219365153,
            "right": 790393.5312350672
        },
        "minLon": 126.0,
        "withZone": false,
        "zoneDegree": 6,
        "crs": {"type": "name", "properties": {"name": "EPSG:4511"}},
        "epsgCode": 4511,
        "zoneNumber": 22,
        "name": "CGCS2000 / Gauss-Kruger CM 129E",
        "centralMeridian": 129.0,
        "maxLon": 132.0
    }),
    "EPSG:4512": new GisCrsInfo({
        "projected": true,
        "envelope": {
            "top": 5367255.828152603,
            "left": 263541.7388068927,
            "bottom": 4987192.7552616615,
            "right": 482969.27468551655
        },
        "minLon": 132.0,
        "withZone": false,
        "zoneDegree": 2,
        "crs": {"type": "name", "properties": {"name": "EPSG:4512"}},
        "epsgCode": 4512,
        "zoneNumber": 66,
        "name": "CGCS2000 / Gauss-Kruger CM 135E",
        "centralMeridian": 133.385,
        "maxLon": 134.77
    }),
    "EPSG:4610": new GisCrsInfo({
        "projected": false,
        "envelope": {"top": 53.56, "left": 73.62, "bottom": 18.11, "right": 134.77},
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": -1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4610"}},
        "epsgCode": 4610,
        "zoneNumber": -1,
        "name": "Xian 1980",
        "centralMeridian": 104.19500000000001,
        "maxLon": 134.77
    }),
    "EPSG:4490": new GisCrsInfo({
        "projected": false,
        "envelope": {"top": 53.56, "left": 73.62, "bottom": 16.7, "right": 134.77},
        "minLon": 73.62,
        "withZone": false,
        "zoneDegree": -1,
        "crs": {"type": "name", "properties": {"name": "EPSG:4490"}},
        "epsgCode": 4490,
        "zoneNumber": -1,
        "name": "China Geodetic Coordinate System 2000",
        "centralMeridian": 104.19500000000001,
        "maxLon": 134.77
    })
}
/**
 * 坐标系范围
 */
export default class GisProjectedBounds {
    static SUPPORT_ESPGCODES = [
        4490,
        4513,
        4514,
        4515,
        4516,
        4517,
        4518,
        4519,
        4520,
        4521,
        4522,
        4523,
        4524,
        4525,
        4526,
        4527,
        4528,
        4529,
        4530,
        4531,
        4532,
        4533
    ];

    static getCrsInfo(epsgCode: number): CrsInfo {
        const info: CrsInfo | undefined = CrsBounds[`EPSG:${epsgCode}`];
        if (info) {
            return info;
        } else {
            throw new Error(`epsgCode:${epsgCode} not found in CrsBounds`);
        }
    }

    static findByPoint(p: number[]): CrsInfo[] {
        let find: CrsInfo[] = [];
        for (const crsBoundsKey in CrsBounds) {
            const crsInfo = CrsBounds[crsBoundsKey];
            const x = p[0];
            const y = p[1];
            if (crsInfo.envelope.left <= x &&
                crsInfo.envelope.right >= x &&
                crsInfo.envelope.bottom <= y &&
                crsInfo.envelope.top >= y) {
                find.push(crsInfo)
            }

        }
        return find;
    }

    static findByLon(x: number): CrsInfo[] {
        let find: CrsInfo[] = [];
        for (let i = this.SUPPORT_ESPGCODES.length - 1; i >= 0; i--) {
            const epsgCode = this.SUPPORT_ESPGCODES[i];
            const crsInfo = this.getCrsInfo(epsgCode);
            if (crsInfo.envelope.left <= x && crsInfo.envelope.right >= x) {
                find.push(crsInfo)
            }
        }
        return find;
    }

    /* static findByLonFull(x: number): CrsInfo[] {
        let find: CrsInfo[] = [];
        for (const crsBoundsKey in CrsBounds) {
            const crsInfo = CrsBounds[crsBoundsKey];
            if (crsInfo.envelope.left <= x && crsInfo.envelope.right >= x) {
                find.push(crsInfo)
            }

        }
        return find;
    } */
}

import * as GeoJSON from 'geojson';
import { Ref } from "vue";

import { GisEvent } from "~/composables/eventBus";
export const Types = {
    DRAWTOOL: "map-event:draw-tool",
    CLEANDRAW: "map-event:clean-draw",
    DRAWEND: "map-event:draw-end",
    NOTIFY: "map-event:notify",
    ADD_FEATURES: "map-event:add-features",
    FLY_TO: "map-event:fly-to",
    ZOOM_TO: "map-event:zoom-to",
    FLASH: "map-event:flash",
}


export class GisMapDrawEvent extends GisEvent {
    constructor(params: {
        type: ('Polygon' | 'Point' | 'LineString' | 'None'),
        cleanBefore: Ref<boolean> | boolean,
        once: Ref<boolean> | boolean,
        keep: Ref<boolean> | boolean,
    }) {
        super(Types.DRAWTOOL,{}, params);
    }
}


export class GisMapCleanDrawEvent extends GisEvent {
    constructor() {
        super(Types.CLEANDRAW, {});
    }
}


export class GisMapDrawEndEvent extends GisEvent {
    constructor(data: string) {
        super(Types.DRAWEND, {}, data);
    }
}

export class GisMapNotifyEvent extends GisEvent {
    constructor(options: Record<string, unknown> = {}, ...datas: unknown[]) {
        super(Types.NOTIFY, options, ...datas);
    }
}

export class GisMapAddFeaturesEvent extends GisEvent {
    constructor(features: GeoJSON.Feature[], options?: Record<string, unknown>) {
        super(Types.ADD_FEATURES, options, features);
    }
}

export class GisMapFlyToEvent extends GisEvent {
    constructor(center: number[], zoom?: number) {
        super(Types.FLY_TO, {}, center, zoom);
    }
}

export class GisMapZoomToEvent extends GisEvent {
    constructor(center: number[], zoom?: number) {
        super(Types.ZOOM_TO, {}, center, zoom);
    }
}

export class GisMapflashFeaturesEvent extends GisEvent {
    constructor(features: GeoJSON.Feature[], options?: Record<string, unknown>) {
        super(Types.FLASH, options, features);
    }
}




/**
 * @file GisMap event definitions
 * @description Defines all map-related event types and event classes for the event bus,
 *              including draw tool, feature add/remove, fly-to/zoom-to, flash, modify, and notify events.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import * as GeoJSON from 'geojson';
import { Ref } from "vue";

import { GisEvent } from "~/composables/eventBus";
/** Map event type identifiers */
export const Types = {
    DRAWTOOL: "map-event:draw-tool",
    CLEANDRAW: "map-event:clean-draw",
    DRAWEND: "map-event:draw-end",
    NOTIFY: "map-event:notify",
    ADD_FEATURES: "map-event:add-features",
    FLY_TO: "map-event:fly-to",
    ZOOM_TO: "map-event:zoom-to",
    FLASH: "map-event:flash",
    START_MODIFY: "map-event:start-modify",
    STOP_MODIFY: "map-event:stop-modify",
    MODIFY_CHANGE: "map-event:modify-change",
    UPDATE_EDIT_FEATURE: "map-event:update-edit-feature",
    SHOW_EDIT_SHADOW: "map-event:show-edit-shadow",
    CLEAR_EDIT_SHADOW: "map-event:clear-edit-shadow",
    SET_LAYER_VISIBILITY: "map-event:set-layer-visibility",
    CLEAN_LAYER: "map-event:clean-layer",
    REMOVE_DRAW_FEATURE: "map-event:remove-draw-feature",
    TOGGLE_DRAW_FEATURE_VISIBLE: "map-event:toggle-draw-feature-visible",
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

export class GisMapStartModifyEvent extends GisEvent {
    constructor(feature: GeoJSON.Feature, options?: Record<string, unknown>) {
        super(Types.START_MODIFY, options, feature);
    }
}

export class GisMapStopModifyEvent extends GisEvent {
    constructor(options?: Record<string, unknown>) {
        super(Types.STOP_MODIFY, options ?? {});
    }
}

export class GisMapModifyChangeEvent extends GisEvent {
    constructor(feature: GeoJSON.Feature) {
        super(Types.MODIFY_CHANGE, {}, feature);
    }
}

export class GisMapUpdateEditFeatureEvent extends GisEvent {
    constructor(feature: GeoJSON.Feature) {
        super(Types.UPDATE_EDIT_FEATURE, {}, feature);
    }
}

export class GisMapRemoveDrawFeatureEvent extends GisEvent {
    constructor(featureId: string) {
        super(Types.REMOVE_DRAW_FEATURE, {}, featureId);
    }
}

export class GisMapToggleDrawFeatureVisibleEvent extends GisEvent {
    constructor(featureId: string, visible: boolean) {
        super(Types.TOGGLE_DRAW_FEATURE_VISIBLE, {}, featureId, visible);
    }
}




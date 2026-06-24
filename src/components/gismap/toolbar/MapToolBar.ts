/**
 * @file Map toolbar definitions
 * @description Defines the toolbar item interface and action enum for the map toolbar,
 *              providing a configuration-driven approach to map tool buttons.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
/** Represents a toolbar button item */
export interface ToolBarItem {
    /** Unique item id */
    id: string;
    /** Display name */
    name: string;
    /** Icon identifier */
    icon: string;
    /** Action to perform when clicked */
    action: ToolBarAction;
    /** Optional action parameters */
    params?: any;
}
/** Toolbar action types */
export enum ToolBarAction {
    /** Trigger draw mode */
    DRAW,
}

export function toolBarItemProcess(item: ToolBarItem){
    switch (item.action) {
        case ToolBarAction.DRAW:
            break;
        default:
            break;
    }

}

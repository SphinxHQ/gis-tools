
import { Map as olMap, View as olView } from "ol";
export interface ToolBarItem {
    id: string;
    name: string;
    icon: string;
    action: ToolBarAction;
    params?: any;
}
export enum ToolBarAction {
    DRAW,
}

export function toolBarItemProcess(item: ToolBarItem,map:olMap){
    switch (item.action) {
        case ToolBarAction.DRAW:
            break;
        default:
            break;
    }

}

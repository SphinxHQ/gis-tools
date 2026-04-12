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

export function toolBarItemProcess(item: ToolBarItem){
    switch (item.action) {
        case ToolBarAction.DRAW:
            break;
        default:
            break;
    }

}

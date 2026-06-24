/**
 * @file EXF parser
 * @description Parses EXF (Exchange Format) structured text with block-based sections
 *              (Head, Coordinates, Attributes) using custom separators.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
export default class ExfPaser {
    /** Field separator character */
    separator = '♂';
    BLOCK_START = 'Begin';
    BLOCK_END = 'End';
    BLOCK_HEAD = 'Head';
    BLOCK_TABLESTRUCTURE = 'TableStructure';
    BLOCK_POLYGON = 'Polygon';
    BLOCK_ATTRIBUTE_TABLE = 'Table';

    TABLE_NAME_FILTER = ["tgeoc_jc_house_5h"]
    EXFLAYER_FILTER = ["2110"]
    blockNames;
    blocks;
    contentLines;

    constructor() {
        this.blockNames = [this.BLOCK_HEAD,
            this.BLOCK_TABLESTRUCTURE,
            this.BLOCK_POLYGON,
            this.BLOCK_ATTRIBUTE_TABLE,]
        this.blocks = this.blockNames.reduce((a, b) => {
            a[b] = [];
            return a;
        }, {})
    }

    parse(content) {

        this.separator = '♂';

        content = content.replace(/\r/g, "")
        this.contentLines = content.split(/\n/g)

        this.process();
    }


    process() {
        this.initBlock()
        this.readHead();
        this.readTableStructure();
        this.readPolygon();
        this.readAttribute();

        this.finish();
    }

    initBlock() {

        let searchBlockName = undefined;
        let curBlock = undefined;
        for (let i = 0; i < this.contentLines.length; i++) {
            let line = this.contentLines[i];

            if (line.endsWith(this.BLOCK_START) && searchBlockName === undefined) {
                for (let j = 0; j < this.blockNames.length; j++) {
                    let blockName = this.blockNames[j];
                    if (line === blockName + this.BLOCK_START) {
                        searchBlockName = blockName;
                        curBlock = this.blocks[searchBlockName];
                        break;
                    }
                }
                continue;
            } else if (line.endsWith(this.BLOCK_END) && searchBlockName !== undefined) {
                if (line === searchBlockName + this.BLOCK_END) {
                    curBlock = undefined;
                    searchBlockName = undefined;
                }

                continue;
            }
            if (curBlock !== undefined) {
                curBlock.push(line)
            }

        }

    }

    readHead() {
        let headBlock = this.blocks[this.BLOCK_HEAD];
        let map = {}
        for (let i = 0; i < headBlock.length; i++) {
            let line = headBlock[i];
            let split = line.split(":");
            if (split.length === 2) {
                let key = split[0].trim();
                map[key] = split[1].trim();
            }
        }

        this.blocks[this.BLOCK_HEAD] = map;
        this.blocks[this.BLOCK_HEAD]._block = headBlock;
        let separator = this.blocks[this.BLOCK_HEAD]["Separator"];
        if (separator !== undefined) {
            this.separator = separator;
        }
    }

    readTableStructure() {
        let tableStructureBlock = this.blocks[this.BLOCK_TABLESTRUCTURE];
        let tableStructure = [];
        let tables = []
        let rowIdx = 0;
        let curTab = undefined;
        for (let i = 0; i < tableStructureBlock.length; i++) {
            let line = tableStructureBlock[i];
            let split = line.split(this.separator);
            if (split.length > 3) {
                rowIdx = -1
            }
            if (split.length === 2 || (split.length === 3 && split[2] === "-1")) {
                rowIdx = 0;
            }

            tableStructure.push(split);
            if (rowIdx === 0) {
                let tableName = split[0].toLowerCase();
                curTab = [];
                curTab.__tableName = tableName
                if (this.TABLE_NAME_FILTER.includes(tableName)) {
                    tables.push(curTab);
                }
            } else if (split.length === 3 && rowIdx > 0) {
                curTab.push({name: split[0], type: split[1], length: split[2]});
            }
            if (rowIdx >= 0)
                rowIdx++;
            if (line === "") {
                rowIdx = 0;
                curTab = undefined;
            }
        }
        this.blocks[this.BLOCK_TABLESTRUCTURE] = tables
        this.blocks[this.BLOCK_TABLESTRUCTURE]._block = tableStructure
    }


    /**
     *
     * **/
    readPolygon() {
        let keys = ["oId", "exfLayerName", "prop1", "prop2", "prop3", "prop4", "prop5", "tableName", "createTime", "lastUpdate", "tableFilter", "prop6", "prop7", "pointCount"];
        let polygonBlock = this.blocks[this.BLOCK_POLYGON];
        let polygons = []
        let curPolygon = undefined;
        let rowIdx = 0;
        let pointCurStart = -1;
        let pointCurEnd = -1;
        for (let i = 0; i < polygonBlock.length; i++) {
            let line = polygonBlock[i];
            let key = keys[rowIdx];
            let split = line.split(this.separator);


            if (rowIdx > keys.length && split.length == 1) {
                rowIdx = 0
            }

            if (line !== null && line !== "") {
                if (rowIdx === 0) {
                    curPolygon = {info: {}, geom: []}
                    polygons.push(curPolygon)
                }
                let info = curPolygon.info
                let geom = curPolygon.geom
                if (key !== undefined) {
                    info[key] = split[0]
                    if (key === "pointCount") {
                        pointCurStart = i + 1;
                        pointCurEnd = i + parseInt(split[0]);
                    }
                }
                if (i >= pointCurStart && i <= pointCurEnd) {
                    geom.push(split.map(x => parseFloat(x)))
                }
                if (rowIdx >= 0)
                    rowIdx++;
            } else {
                rowIdx = 0;
                curPolygon = undefined;
            }
        }
        polygons.forEach(x => {
            x.wkt = this.pointsToWkt(x.geom)
            if (x.info.tableFilter === "*") {
                x.info.tableName = this.blocks[this.BLOCK_TABLESTRUCTURE][0].__tableName;
            }
            delete x.geom
        })

        this.blocks[this.BLOCK_POLYGON] = polygons.filter(p => {
            return this.blocks[this.BLOCK_TABLESTRUCTURE].find(x =>  p.info.tableName && x.__tableName === p.info.tableName.toLowerCase())
                && this.EXFLAYER_FILTER.includes(p.info.exfLayerName)
        });
    }

    pointsToWkt(points) {
        if (!Array.isArray(points)) {
            return;
        }
        if (points.length < 2) {
            return;
        }
        let vertexes = [...points]
        let firstPoint = vertexes[0];
        let lastPoint = vertexes[vertexes.length - 1];
        if (!this.equalsPoint(firstPoint, lastPoint)) {
            vertexes.push(firstPoint);
        }
        if (vertexes.length <= 3) {
            throw new Error("构面至少需要3个点");
        }

        let ringsIndex = [];
        let searchIdx = -1;
        for (let i = 1; i < vertexes.length; i++) {
            for (let j = i - 1; j > searchIdx; j--) {
                if (this.equalsPoint(vertexes[j], vertexes[i])) {
                    searchIdx = i;
                    ringsIndex.push([j, i]);
                }
            }

        }

        let rings = []
        ringsIndex.forEach((x, idx) => {
            let l = x[0];
            let h = x[1];
            rings[idx] = []
            for (let i = l; i <= h; i++) {
                rings[idx].push(vertexes[i])
            }
        })


        let ringWkts = []
        for (let i = 0; i < rings.length; i++) {
            let ring = rings[i];
            ringWkts.push("(" + ring.map(x => `${x[0]} ${x[1]}`).join(",") + ")")
        }

        return `POLYGON(${ringWkts.join(",")})`
    }

    equalsPoint(p1, p2) {
        return p1[0] === p2[0] && p1[1] === p2[1]
    }

    readAttribute() {
        let attributeBlock = this.blocks[this.BLOCK_ATTRIBUTE_TABLE];
        let attributes = []
        let rowIdx = 0;
        let curTabName = undefined;
        for (let i = 0; i < attributeBlock.length; i++) {

            let line = attributeBlock[i];
            let split = line.split(this.separator);

            if (split.length === 3 || (split.length === 4 && split[2] == -1)) {
                {
                    rowIdx = 0;
                    curTabName = split[0].toLowerCase();
                }
            } else {
                if (!this.TABLE_NAME_FILTER.includes(curTabName)) {
                    continue;
                }
                let item = {
                    __count: undefined,
                    __exfLayerName: undefined,
                    __layerName: undefined,
                    __tableName: undefined,
                    layer: undefined
                }
                split.forEach((x, idx) => {

                    if (idx === 1) {
                        item.__count = parseInt(x);
                    } else if (rowIdx === 2) {
                        item.__exfLayerName = x;
                    } else if (rowIdx === 3) {
                        let ll = x.split(this.separator)[0];
                        if (ll.includes("_")) {
                            ll = ll.substring(0, ll.indexOf("_"));
                        }
                        item.__layerName = ll;
                    }
                    let curTabStructure = this.blocks[this.BLOCK_TABLESTRUCTURE].find(x => x.__tableName === curTabName);
                    let keyInfo = curTabStructure[idx];
                    if (keyInfo !== undefined) {
                        item[keyInfo.name] = x;
                    }

                })
                item.__tableName = curTabName
                item.layer = curTabName

                attributes.push(item);
            }

            rowIdx++;
        }
        this.blocks[this.BLOCK_ATTRIBUTE_TABLE] = attributes;
    }

    finish() {
        if (this.blocks[this.BLOCK_POLYGON].length !== 1 && this.blocks[this.BLOCK_ATTRIBUTE_TABLE].length !== this.blocks[this.BLOCK_POLYGON].length) {
            throw new Error("attribute and polygon count not match");
        }
        this.blocks[this.BLOCK_POLYGON].forEach((x, idx) => {
            x.properties = this.blocks[this.BLOCK_ATTRIBUTE_TABLE][idx]
        })

    }
}

import {isReactive, isRef} from "vue";

import {GisError, GisErrorCode} from "~/common/GisError";
import {logger} from "~/common/logger";

export default {
    sleep(time: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, time));
    },
    timeout(fn: () => void, ms: number = 0): void {
        setTimeout(fn, ms);
    },
    saveLocal(key: string, val: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                logger.error('localStorage存储空间已满', e);
                throw new GisError(GisErrorCode.STORAGE_WRITE_FAILED, 'localStorage存储空间已满', e);
            }
            logger.error('localStorage写入失败', e);
            throw new GisError(GisErrorCode.STORAGE_WRITE_FAILED, 'localStorage写入失败', e);
        }
    },
    loadLocal(key: string, defaultValue: unknown = null): unknown {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            logger.warn(`loadLocal failed for key "${key}":`, e);
            try {
                localStorage.removeItem(key);
            } catch (removeError) {
                logger.error('Failed to remove corrupted localStorage item:', removeError);
            }
            return defaultValue;
        }
    },
    uuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    isPrimitive(data: unknown): boolean {
        const _type = Object.prototype.toString.call(data);
        const _primitives = ["[object String]", "[object Number]", "[object Boolean]", "[object Null]", "[object Undefined]"];
        return _primitives.includes(_type);
    },
    isCloneable(data: unknown, objs?: unknown[]): boolean {
        try {
            if (this.isPrimitive(data)) {
                return true;
            }
            if (objs && objs.includes(data)) {
                return false;
            }
            if (isRef(data) || isReactive(data)) {
                return false;
            }
            const propertyNames = Object.getOwnPropertyNames(data);
            return propertyNames.every(propName => this.isCloneable((data as Record<string, unknown>)[propName], [...(objs || []), data]));
        } catch {
            return false;
        }
    },
    getTiandituApiKey(): string {
        const apiKey = import.meta.env.VITE_TIANDITU_API_KEY || '';
        if (!apiKey) {
            logger.warn('天地图API Key未配置，地图功能可能无法正常使用。请在.env.local中设置VITE_TIANDITU_API_KEY');
        }
        return apiKey;
    },
    dataTimeToLocal(time: number): string {
        return new Date(time).toLocaleString();
    },
    base64ToArrayBuffer(base64: string): ArrayBuffer {
        try {
            let b64 = base64;
            if (b64.startsWith("data:")) {
                const commaIndex = b64.indexOf("base64,");
                if (commaIndex === -1) {
                    throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Invalid data URL format');
                }
                b64 = b64.substring(commaIndex + 7);
            }
            
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) {
                throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Invalid Base64 string');
            }
            
            const binaryString = (globalThis.atob?.(b64) ?? atob(b64));
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (e) {
            if (e instanceof GisError) throw e;
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Base64 decoding failed', e);
        }
    },
    base64ToFile(base64: string, fileName: string): File {
        try {
            const base64Data = base64.replace(/^data:(.*?);base64,/, '');
            
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
                throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Invalid Base64 string');
            }
            
            const binaryData = (globalThis.atob?.(base64Data) ?? atob(base64Data));
            const arrayBuffer = new ArrayBuffer(binaryData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }
            const blob = new Blob([arrayBuffer], {type: 'application/octet-stream'});
            return new File([blob], fileName, {type: 'application/octet-stream'});
        } catch (e) {
            if (e instanceof GisError) throw e;
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Base64 to File conversion failed', e);
        }
    },
    ArrayBufferToFile(content: ArrayBuffer, fileName: string): File {
        const blob = new Blob([content], {type: 'application/octet-stream'});
        return new File([blob], fileName, {type: 'application/octet-stream'});
    },
    hasNoUsedChar(str: string): boolean {
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 0x9FA5) {
                return true;
            }
        }
        return false;
    },
    arrayBufferToString(arrayBuffer: ArrayBuffer): string | null {
        const CHARTS = ["UTF-8", "GBK", "GB2312", "BIG5"];
        let decode: string | null = null;
        for (const chart of CHARTS) {
            decode = new TextDecoder(chart).decode(arrayBuffer);
            if (this.hasNoUsedChar(decode)) {
                continue;
            } else {
                break;
            }
        }
        return decode?.trim() ?? null;
    },
}

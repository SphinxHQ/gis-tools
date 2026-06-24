/**
 * @file Common utility functions
 * @description Provides general-purpose utilities including sleep, localStorage helpers,
 *              UUID generation, deep clone checks, Tianditu API key retrieval, Base64/File/ArrayBuffer
 *              conversions, and multi-encoding text decoding.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import {isReactive, isRef} from "vue";

import {GisError, GisErrorCode} from "~/common/GisError";
import {logger} from "~/common/logger";

export default {
    /**
     * Sleep for the specified milliseconds
     * @param time - Duration in milliseconds
     * @returns A promise that resolves after the delay
     */
    sleep(time: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, time));
    },
    /**
     * Execute a function after a delay
     * @param fn - Function to execute
     * @param ms - Delay in milliseconds (default 0)
     */
    timeout(fn: () => void, ms: number = 0): void {
        setTimeout(fn, ms);
    },
    /**
     * Save a value to localStorage with JSON serialization
     * @param key - Storage key
     * @param val - Value to serialize and store
     * @throws {GisError} When storage is full or write fails
     */
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
    /**
     * Load and parse a value from localStorage
     * @param key - Storage key
     * @param defaultValue - Value to return if key not found or parse fails
     * @returns The parsed value or defaultValue
     */
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
    /**
     * Generate a RFC 4122 v4 compliant UUID
     * @returns A UUID string
     */
    uuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    /**
     * Check if a value is a primitive type (string, number, boolean, null, undefined)
     * @param data - Value to check
     * @returns True if the value is primitive
     */
    isPrimitive(data: unknown): boolean {
        const _type = Object.prototype.toString.call(data);
        const _primitives = ["[object String]", "[object Number]", "[object Boolean]", "[object Null]", "[object Undefined]"];
        return _primitives.includes(_type);
    },
    /**
     * Check if a value can be safely deep-cloned (no circular refs, no Vue refs/reactives)
     * @param data - Value to check
     * @param objs - Internal parameter for tracking visited objects (cycle detection)
     * @returns True if the value is cloneable
     */
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
    /**
     * Get the Tianditu API key from environment variables
     * @returns The API key string (may be empty if not configured)
     */
    getTiandituApiKey(): string {
        const apiKey = import.meta.env.VITE_TIANDITU_API_KEY || '';
        if (!apiKey) {
            logger.warn('天地图API Key未配置，地图功能可能无法正常使用。请在.env.local中设置VITE_TIANDITU_API_KEY');
        }
        return apiKey;
    },
    /**
     * Convert a timestamp to a localized date-time string
     * @param time - Timestamp in milliseconds
     * @returns Localized date-time string
     */
    dataTimeToLocal(time: number): string {
        return new Date(time).toLocaleString();
    },
    /**
     * Decode a Base64 string (optionally with data URL prefix) to an ArrayBuffer
     * @param base64 - Base64 string, optionally prefixed with "data:...;base64,"
     * @returns Decoded ArrayBuffer
     * @throws {GisError} When the Base64 string is invalid or decoding fails
     */
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
    /**
     * Convert a Base64 string to a File object
     * @param base64 - Base64 string, optionally with data URL prefix
     * @param fileName - Name for the resulting File
     * @returns A File object containing the decoded data
     * @throws {GisError} When the Base64 string is invalid or conversion fails
     */
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
    /**
     * Convert an ArrayBuffer to a File object
     * @param content - ArrayBuffer containing file data
     * @param fileName - Name for the resulting File
     * @returns A File object with the ArrayBuffer content
     */
    ArrayBufferToFile(content: ArrayBuffer, fileName: string): File {
        const blob = new Blob([content], {type: 'application/octet-stream'});
        return new File([blob], fileName, {type: 'application/octet-stream'});
    },
    /**
     * Check if a string contains characters beyond the CJK Unified Ideographs range
     * @param str - String to check
     * @returns True if the string contains characters with code > 0x9FA5
     */
    hasNoUsedChar(str: string): boolean {
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 0x9FA5) {
                return true;
            }
        }
        return false;
    },
    /**
     * Decode an ArrayBuffer to a string, trying multiple encodings (UTF-8, GBK, GB2312, BIG5)
     * @param arrayBuffer - Buffer to decode
     * @returns Decoded string (trimmed) or null if all encodings produce invalid characters
     */
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

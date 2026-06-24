/**
 * @file Local database singleton
 * @description Creates and exports a singleton LocalDb instance for IndexedDB access
 *              across the application.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import LocalDb from "~/components/data/LocalDb";

const _localDb = new LocalDb();
export const localDb = _localDb;

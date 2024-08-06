export default {
    sleep(time:number):Promise<void>{
        return new Promise(resolve => setTimeout(resolve, time));
    },
    saveLocal(key: string, val: any): void {
        localStorage.setItem(key, JSON.stringify(val));
    },
    loadLocal(key: string): any {
        return JSON.parse(localStorage.getItem(key) as string);
    },
    uuid(): string {
        let RANDOMKEY = 0;
        let str = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16) + (++RANDOMKEY);
        });

        return str.substring(str.length - 45);
    },
    getTiandituApiKey(): string {
        const tiandituApiKey: string = '23c0fc2a183d6d35b0458286e79ff99f';

        return tiandituApiKey;
    }
}

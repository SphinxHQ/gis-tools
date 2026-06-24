<template>
    <div class="bottom-container">
<div v-for="log in logs" :key="log" class="log-item">
    {{ log }}
</div>
    </div>
</template>

<script setup lang="ts">
/**
 * @file Bottom panel component
 * @description Resizable bottom panel for data display.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */

import { ref } from 'vue';

import { eventBus } from '~/composables/eventBus';

/** Log message list displayed in the bottom panel */
const logs = ref<string[]>([]);

/** Listen to console-log events from the event bus and append messages to the log list */
eventBus.on('main','console-log', (...args: any[]) => {
    if(args?.length>0){
        args.forEach((item:any)=>{
            try{
                item = JSON.stringify(item);
            }catch(e){
                item = item.toString();
            }
            logs.value.push(item);
        });
    }
});

</script>

<style scoped>
.bottom-container{
    height: 100%;
    width: 100%;
    overflow-y: scroll;
}
.log-item{
    padding: 5px;
    margin: 8px;
    border-radius: 5px;
    background-color: var(--el-color-primary);
    border: 1px solid var(--ep-border-color-dark);
}
</style>
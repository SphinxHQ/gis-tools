<template>
    <div class="bottom-container">
<div v-for="log in logs" :key="log" class="log-item">
    {{ log }}
</div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { eventBus } from '~/composables/eventBus';
const logs = ref<string[]>([]);
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
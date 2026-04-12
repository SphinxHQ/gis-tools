import { ElMessage, ElMessageBox, ElOption, ElSelect} from "element-plus";
import {h, ref} from "vue";

export class UIHelper {
    static selectConfirm<T extends {
        label?: string,
        name?: string
    }>(title: string, message: string | null, options: T[]): Promise<T> {

        return new Promise<T>((resolve) => {
            const width = 400;
            const modelValue = ref<{ data: T }>();
            const _options: any[] = [];
            options.forEach(((opt, idx) => {
                if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
                    _options.push(h(ElOption, {
                        label: opt,
                        value: {
                            id: idx,
                            data: opt,
                        },
                        key: idx
                    }))
                } else {
                    _options.push(h(ElOption, {
                        label: opt?.label || opt?.name,
                        value: {
                            id: idx,
                            data: opt,
                        },
                        key: idx
                    }))
                }
            }));
            ElMessageBox({
                title: `${title}`,
                autofocus: true,
                customStyle: {
                    width: `${width}px`
                },
                showClose: false,
                closeOnClickModal: false,
                showConfirmButton: true,
                confirmButtonText: '确定',
                confirmButtonClass: 'el-button--primary',
                dangerouslyUseHTMLString: true,
                beforeClose(action, instance, done) {
                    if (action === 'confirm' && modelValue.value !== undefined) {
                        resolve(modelValue.value.data);
                        done();
                        return;
                    }
                    ElMessage.warning('请选择');
                },
                message: () => (h('div', {
                        style: {
                            width: `${width - 20}px`
                        },
                    }, [
                        message ? h('p', {
                            style: {
                                width: `${width - 20}px`,
                                marginBottom: '10px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }
                        }, message) : undefined,
                        h(ElSelect, {
                            placeholder: '请选择',
                            style: 'width:100%',
                            filterable: true,
                            modelValue: modelValue.value,
                            'onUpdate:modelValue': (val: any) => {
                                modelValue.value = val;
                            },
                            valueKey: "id",
                        }, {default: () => _options})
                    ]
                )),
            })

        })
    }
}

<template>
  <div id="space">
    <div ref="cont"></div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref, type Ref } from 'vue'

import { useScene } from './hooks'
defineOptions({
  name: 'TheSpace'
})
const cont: Ref<HTMLElement> = ref(null) as unknown as Ref<HTMLElement>

const { awake, bindWindowResize, onWindowResize } = useScene(cont)

onMounted(() => {
  nextTick(() => {
    awake()
    bindWindowResize()
    onWindowResize()
  })
})
</script>

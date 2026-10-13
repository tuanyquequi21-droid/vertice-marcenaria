import test from 'node:test';import assert from 'node:assert/strict';import {calculateCabinet} from './engine.mjs';
test('gera lista de peças com dimensões positivas',()=>{const p=calculateCabinet();assert.equal(p.parts.find(x=>x.name==='Lateral').qty,2);assert.equal(p.parts.find(x=>x.name==='Porta').qty,2);assert.ok(p.parts.every(x=>x.width>0&&x.height>0));});
test('calcula área, fita e custo finitos',()=>{const p=calculateCabinet();assert.ok(p.areaM2>0);assert.ok(p.edgeM>0);assert.ok(Number.isFinite(p.estimatedMaterialCost));});
test('sem portas e sem prateleiras não gera essas peças',()=>{const p=calculateCabinet({doors:0,shelves:0});assert.ok(!p.parts.some(x=>x.name==='Porta'||x.name==='Prateleira'));});
test('recusa geometria inválida',()=>{assert.throws(()=>calculateCabinet({width:30,thickness:18}),RangeError);assert.throws(()=>calculateCabinet({doors:13}),RangeError);assert.throws(()=>calculateCabinet({shelves:-1}),RangeError);});

test('aceita quatro portas e quatro gavetas no mesmo armário',()=>{const p=calculateCabinet({width:1600,height:2400,doors:4,drawers:4});assert.equal(p.parts.find(x=>x.name==='Porta').qty,4);assert.equal(p.parts.find(x=>x.name==='Frente de gaveta').qty,4);assert.ok(p.layout.doorHeight>0);assert.ok(p.layout.drawerHeight>0);assert.ok(p.parts.some(x=>x.name==='Divisória horizontal'));});
test('recusa quantidade excessiva de gavetas e frentes sem altura suficiente',()=>{assert.throws(()=>calculateCabinet({drawers:13}),RangeError);assert.throws(()=>calculateCabinet({height:400,drawers:8}),RangeError);});

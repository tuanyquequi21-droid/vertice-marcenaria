import test from 'node:test';import assert from 'node:assert/strict';import {calculateCabinet} from './engine.mjs';
test('gera lista de peças com dimensões positivas',()=>{const p=calculateCabinet();assert.equal(p.parts.find(x=>x.name==='Lateral').qty,2);assert.equal(p.parts.find(x=>x.name==='Porta').qty,2);assert.ok(p.parts.every(x=>x.width>0&&x.height>0));});
test('calcula área, fita e custo finitos',()=>{const p=calculateCabinet();assert.ok(p.areaM2>0);assert.ok(p.edgeM>0);assert.ok(Number.isFinite(p.estimatedMaterialCost));});
test('sem portas e sem prateleiras não gera essas peças',()=>{const p=calculateCabinet({doors:0,shelves:0});assert.ok(!p.parts.some(x=>x.name==='Porta'||x.name==='Prateleira'));});
test('recusa geometria inválida',()=>{assert.throws(()=>calculateCabinet({width:30,thickness:18}),RangeError);assert.throws(()=>calculateCabinet({doors:3}),RangeError);assert.throws(()=>calculateCabinet({shelves:-1}),RangeError);});

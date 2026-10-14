// Execute com: node --test tests/financeiro.test.cjs
// Sem dependências externas; extrai a função real do código para evitar cópia divergente.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/app-v6.js'), 'utf8');
const match = source.match(/function transactionAmount\(x\)\{[^}]*\}/);
assert.ok(match, 'transactionAmount deve existir no app-v6.js');
const transactionAmount = vm.runInNewContext('(' + match[0] + ')');

test('preserva zero explícito sem substituí-lo pelo total', () => {
  assert.equal(transactionAmount({valor: 0, valor_total: 100}), 0);
});
test('usa valor_total apenas quando valor está ausente', () => {
  assert.equal(transactionAmount({valor_total: 125.5}), 125.5);
  assert.equal(transactionAmount({valor: null, valor_total: 125.5}), 125.5);
});
test('mantém valores negativos e valores numéricos em string', () => {
  assert.equal(transactionAmount({valor: -25}), -25);
  assert.equal(transactionAmount({valor: '19.75'}), 19.75);
});
test('ausência de valores retorna zero', () => {
  assert.equal(transactionAmount({}), 0);
});

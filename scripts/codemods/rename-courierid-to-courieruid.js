/**
 * jscodeshift codemod to rename `courierId` → `courierUid` in code
 * - object properties (literals and identifiers)
 * - member expressions (obj.courierId)
 * - string literal keys used in Firestore queries (where('courierId', ...))
 * - TypeScript property signatures
 * Run with: pnpm dlx jscodeshift -t scripts/codemods/rename-courierid-to-courieruid.js <path> --parser=tsx
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 1) Rename object property keys: { courierId: ... } -> { courierUid: ... }
  root.find(j.Property).forEach((p) => {
    const key = p.value.key;
    if (!key) return;
    if ((key.type === 'Identifier' && key.name === 'courierId') || (key.type === 'Literal' && key.value === 'courierId')) {
      if (key.type === 'Identifier') key.name = 'courierUid';
      else key.value = 'courierUid';
    }
  });

  // 2) Rename member expressions: obj.courierId -> obj.courierUid
  root.find(j.MemberExpression, { property: { name: 'courierId' } }).forEach((p) => {
    p.value.property.name = 'courierUid';
  });

  // 3) String literal occurrences used as property keys or Firestore where() args
  root.find(j.Literal, { value: 'courierId' }).forEach((p) => {
    p.value.value = 'courierUid';
  });

  // 4) Update TypeScript Interface / Type property signatures
  root.find(j.TSPropertySignature).forEach((p) => {
    const key = p.value.key;
    if (!key) return;
    if (key.type === 'Identifier' && key.name === 'courierId') {
      key.name = 'courierUid';
    }
  });

  // 5) Update JSX attributes: <Component courierId=... /> -> courierUid
  root.find(j.JSXAttribute, { name: { name: 'courierId' } }).forEach((p) => {
    p.value.name.name = 'courierUid';
  });

  return root.toSource({ quote: 'single' });
};

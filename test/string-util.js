const assert = require('assert');
const {StringUtil} = require('../out/server/utils/StringUtil');

describe('StringUtil', () => {
  describe('▶️ endWith()', () => {
    it('null end with null', () => {
      assert.equal(StringUtil.endWith(null, null), true);
    });
    it('null not end with undefined', () => {
      assert.equal(StringUtil.endWith(null, undefined), false);
    });
    it('null not end with ""', () => {
      assert.equal(StringUtil.endWith(null, ''), false);
    });
    it('normal string endsWith call', () => {
      assert.equal(StringUtil.endWith('big.png', '.png'), true);
    });
  });
  describe('▶️ trimLeft()', () => {
    it('trim null -> ""', () => {
      assert.equal(StringUtil.trimLeft(null), '');
    });
    it('trim undefined -> ""', () => {
      assert.equal(StringUtil.trimLeft(null), '');
    });
    it('nothing to trim', () => {
      assert.equal(StringUtil.trimLeft('null'), 'null');
    });
    it('all to trim', () => {
      assert.equal(StringUtil.trimLeft(' \t\n\r\f\n\t '), '');
    });
    it('part to trim', () => {
      assert.equal(StringUtil.trimLeft(' \t\n\rabc\f\n\t '), 'abc\f\n\t ');
    });
    it('spaces in middle of string', () => {
      assert.equal(StringUtil.trimLeft(' \t\n\ra  bc\f\n\t '), 'a  bc\f\n\t ');
    });
  });
  describe('▶️ trimRight()', () => {
    it('trim null -> ""', () => {
      assert.equal(StringUtil.trimRight(null), '');
    });
    it('trim undefined -> ""', () => {
      assert.equal(StringUtil.trimRight(null), '');
    });
    it('nothing to trim', () => {
      assert.equal(StringUtil.trimRight('null'), 'null');
    });
    it('all to trim', () => {
      assert.equal(StringUtil.trimRight(' \t\n\r\f\n\t '), '');
    });
    it('part to trim', () => {
      assert.equal(StringUtil.trimRight(' \t\n\rabc\f\n\t '), ' \t\n\rabc');
    });
    it('spaces in middle of string', () => {
      assert.equal(StringUtil.trimRight(' \t\n\ra  bc\f\n\t '), ' \t\n\ra  bc');
    });
  });
  describe('▶️ checkInString()', () => {
    it('字符串为 null', () => {
      assert.equal(StringUtil.checkInString(null, 1), false);
    });
    it('字符串为 undefined', () => {
      assert.equal(StringUtil.checkInString((void 0), 1), false);
    });
    it('index 下端越界', () => {
      assert.equal(StringUtil.checkInString('', -1), false);
    });
    it('index 上端越界', () => {
      assert.equal(StringUtil.checkInString('', 0), false);
    });
    it('普通情况', () => {
      assert.equal(StringUtil.checkInString('abc"def', 6), true);
    });
    it('index 指定的位置为字符串的左引号', () => {
      assert.equal(StringUtil.checkInString('"abc', 0), false);
    });
    it('index 指定的位置为字符串的右引号', () => {
      assert.equal(StringUtil.checkInString('ab"cde"', 6), false);
    });
    it('忽略字符串中的引号', () => {
      assert.equal(StringUtil.checkInString('\'a"b\'ab', 6), false);
    });
    it('不忽略字符串之外的引号', () => {
      assert.equal(StringUtil.checkInString('\'ab\'"ab', 6), true);
    });
    it('忽略换行之前的部分', () => {
      assert.equal(StringUtil.checkInString('abc"\nabc', 6), false);
    });
    it('忽略转义的单引号', () => {
      assert.equal(StringUtil.checkInString('abc\\\'def', 6), false);
    });
    it('忽略转义的双引号', () => {
      assert.equal(StringUtil.checkInString('abc\\"def', 6), false);
    });
    it('一个单引号一个双引号', () => {
      assert.equal(StringUtil.checkInString('ab"\'def', 6), true);
    });
    it('忽略换行之前的部分+右边界', () => {
      assert.equal(StringUtil.checkInString('ab\ncde"', 6), false);
    });
    it('忽略换行之前的部分+右边界', () => {
      assert.equal(StringUtil.checkInString('ab"\n"d', 5), true);
    });
    it('忽略 index 之后的部分 1', () => {
      assert.equal(StringUtil.checkInString('ab"cde"', 5), true);
    });
    it('忽略 index 之后的部分 2', () => {
      assert.equal(StringUtil.checkInString('ab"cdef', 5), true);
    });
  });
});
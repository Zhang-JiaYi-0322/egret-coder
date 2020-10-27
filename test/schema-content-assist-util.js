const assert = require('assert');
const path = require('path');
const fs = require('fs')

const { SchemaContentAssistUtil } = require('../out/server/schemas/SchemaContentAssistUtil');
const { EXMLPos } = require('../out/server/schemas/ISchemaContentAssist');
const { XMLDocument } = require('../out/server/core/XMLDocument');

const simpleExmlPath = path.join(__dirname, 'schema-content-assist-util-simple.exml');
const simpleExml = fs.readFileSync(simpleExmlPath, 'utf8');
const exml = new XMLDocument('', simpleExml);

/**
 * 保留这个函数
 * 如果以后 `checkCursorPos()` 的机制变了, 需要对这个位置值做纠正, 可以在这个函数体内完成
 * 比如 `p => p - 1`
 */
const pos = p => p;

describe('▶️ SchemaContentAssistUtil', () => {
  describe('▶️ checkCursorPos() 正常处理', () => {
    it('内容开始之前', () => {
      const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(0));
      assert.equal(result.pos, EXMLPos.Undefined);
    });
    describe('▶️ 指令部分', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(20));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(39));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
    });
    describe('▶️ 普通节点', () => {
      describe('▶️ 节点名部分', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(40));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(43));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(46));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
      });
      describe('▶️ 属性', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(47));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(50));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(52));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
      });
      describe('▶️ 属性值', () => {
        it('左引号', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(53));
          assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
        });
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(54));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(55));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(57));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
        it('右引号', () => {
          //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(58));
          //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
        });
      });
      describe('▶️ 属性(命名空间声明)', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(107));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(112));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(114));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
      });
      describe('▶️ 属性值(命名空间声明)', () => {
        it('左引号', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(115));
          assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
        });
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(116));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(120));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(140));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
        it('右引号', () => {
          //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(58));
          //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
        });
      });
    });
    describe('▶️ 中文+英文注释', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(168));
        assert.equal(result.pos, EXMLPos.Comment);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(180));
        assert.equal(result.pos, EXMLPos.Comment);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(200));
        assert.equal(result.pos, EXMLPos.Comment);
      });
    });
    describe('▶️ 被注释的节点', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(204));
        assert.equal(result.pos, EXMLPos.Comment);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(250));
        assert.equal(result.pos, EXMLPos.Comment);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(301));
        assert.equal(result.pos, EXMLPos.Comment);
      });
    });
    describe('▶️ 自闭合节点的结束部分', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(392));
        assert.equal(result.pos, EXMLPos.Undefined);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(393));
        assert.equal(result.pos, EXMLPos.Undefined);
      });
    });
    it('自闭合节点之后', () => {
      const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(394));
      assert.equal(result.pos, EXMLPos.Text);
    });
    describe('▶️ 闭合节点', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(429));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(430));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(438));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
    });
    it('普通闭合节点之后', () => {
      const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(439));
      assert.equal(result.pos, EXMLPos.Text);
    });
    describe('▶️ CDATA', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(442));
        assert.equal(result.pos, EXMLPos.CDATA);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(543));
        assert.equal(result.pos, EXMLPos.CDATA);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(802));
        assert.equal(result.pos, EXMLPos.CDATA);
      });
    });
    it('CDATA 之后', () => {
      const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(803));
      assert.equal(result.pos, EXMLPos.Text);
    });
    describe('▶️ CDATA/Comment 之后的节点', () => {
      describe('▶️ 节点名部分', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(806));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(810));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(813));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
      });
      describe('▶️ 第一个属性', () => {
        describe('▶️ 属性', () => {
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(814));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(815));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(816));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
        });
        describe('▶️ 属性值', () => {
          it('左引号', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(817));
            assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
          });
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(818));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(820));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(829));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
          it('右引号', () => {
            //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(58));
            //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
          });
        });
      });
      describe('▶️ 最后一个属性', () => {
        describe('▶️ 属性', () => {
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(893));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(895));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(896));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
        });
        describe('▶️ 属性值', () => {
          it('左引号', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(897));
            assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
          });
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(898));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(899));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(900));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
          it('右引号', () => {
            //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(58));
            //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
          });
        });
      });
    });
    describe('▶️ 闭合节点(根节点)', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(905));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(910));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(913));
        assert.equal(result.pos, EXMLPos.NodeEnd);
      });
    });
    it('根节点之后', () => {
      const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(914));
      assert.equal(result.pos, EXMLPos.Undefined);
    });
  });
  describe('▶️ checkCursorPos() 容错处理', () => {
    describe('▶️ 重复的指令', () => {
      it('起始点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(915));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
      it('中间', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(930));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
      it('结束点', () => {
        const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(952));
        assert.equal(result.pos, EXMLPos.ProcessingInstruction);
      });
    });
    describe('▶️ 第二个根节点', () => {
      describe('▶️ 节点名部分', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(954));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(957));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(960));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
      });
      describe('▶️ 属性', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(961));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(962));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(963));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
      });
      describe('▶️ 属性值', () => {
        it('左引号', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(964));
          assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
        });
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(965));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(968));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(971));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
        it('右引号', () => {
          //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(58));
          //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
        });
      });
      describe('▶️ 属性(命名空间声明)', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(973));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(977));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(980));
          assert.equal(result.pos, EXMLPos.AttributeName);
        });
      });
      describe('▶️ 属性值(命名空间声明)', () => {
        it('左引号', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(981));
          assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
        });
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(982));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(990));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1002));
          assert.equal(result.pos, EXMLPos.AttributeValue);
        });
        // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
        it('右引号', () => {
          //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1003));
          //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
        });
      });
    });
    describe('▶️ 无效节点 <> 之后的节点', () => {
      describe('▶️ 节点名部分', () => {
        it('起始点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1052));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('中间', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1056));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
        it('结束点', () => {
          const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1060));
          assert.equal(result.pos, EXMLPos.NodeStart);
        });
      });
      describe('▶️ 第一个属性', () => {
        describe('▶️ 属性', () => {
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1061));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1063));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1066));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
        });
        describe('▶️ 属性值', () => {
          it('左引号', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1067));
            assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
          });
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1068));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1069));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1070));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
          it('右引号', () => {
            //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1071));
            //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
          });
        });
      });
      describe('▶️ 重复的属性', () => {
        describe('▶️ 属性', () => {
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1098));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1102));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1107));
            assert.equal(result.pos, EXMLPos.AttributeName);
          });
        });
        describe('▶️ 属性值', () => {
          it('左引号', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1108));
            assert.equal(result.pos, EXMLPos.AttributeValueLeftQuote);
          });
          it('起始点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1109));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('中间', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1112));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          it('结束点', () => {
            const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1114));
            assert.equal(result.pos, EXMLPos.AttributeValue);
          });
          // 这个目前没有实现, 因为右引号位置是在右引号的右边, 已经出了属性值范围, 没有实用意义
          it('右引号', () => {
            //   const result = SchemaContentAssistUtil.checkCursorPos(exml, pos(1115));
            //   assert.equal(result.pos, EXMLPos.AttributeValueRightQuote);
          });
        });
      });
    });
  });
});
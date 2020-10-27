/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as sax from './sax';
import { Namespace } from './Namespace';

export function namespaceDeclarations(xml: sax.Tag): Array<Namespace> {
  let retArr: Array<Namespace> = new Array<Namespace>();
  let space: Namespace = new Namespace(xml.prefix, xml.namespace);
  retArr.push(space);
  return retArr;
}

export function parse(xmlString, throwError = true, messageWithPos = true): sax.Tag {
  let strict = true; // set to false for html-mode
  let saxparser = sax.parser(strict, { position: true, messagePos: messageWithPos });
  let object: sax.Tag = null;
  let namespaces = {};
  let errors: sax.Error[] = [];
  let attribNodes: sax.Attribute[] = [];
  let comments: sax.Comment[] = [];
  let processingInstructions: sax.ProcessingInstruction[] = [];
  let roots: sax.Tag[] = [];

  saxparser.resume();
  saxparser.onerror = function (err) {
    let error: sax.Error = {
      start: saxparser.startAttribPosition || saxparser.startTagPosition,
      end: saxparser.position,
      line: saxparser.line,
      column: saxparser.column,
      name: err.message,
      message: err.message
    };
    errors.push(error);
  };
  saxparser.onopentag = function (node: sax.Tag) {
    let attribs = node.attributes;
    node.nodeType = sax.Type.Tag;
    node.attributeNodes = attribNodes.filter(a => a.start > saxparser.startTagPosition);
    node.attributeNodes.forEach(a => a.parent = node);
    node.start = saxparser.startTagPosition - 1;
    node.line = saxparser.line;
    node.column = saxparser.column;
    node.children = [];
    node.startTagEnd = saxparser.position + 1;

    for (let key in attribs) {
      let idx = key.indexOf('xmlns:');
      if (idx === 0) {
        let prefix: string = key.substring(6);
        let uri = attribs[key];
        namespaces[prefix] = uri;
      }
    }
    node.toString = function () { return this.text; };
    let name = node.name;
    let index = name.indexOf(':');
    if (index === -1) {
      node.namespace = '';
      node.prefix = '';
      node.localName = name;
    } else {
      let prefix: string = name.substring(0, index);
      node.prefix = prefix;
      node.namespace = namespaces[prefix];
      node.localName = name.substring(index + 1);
    }
    if (object) {
      let children = object.children;
      if (!children) {
        children = object.children = [];
        if (object.text) {
          object.text = '';
        }
      }
      children.push(node);
      node.parent = object;
      object = node;
    } else {
      roots.push(node);
      object = node;
    }
  };

  saxparser.onattribute = function (attr) {
    let attrNode: sax.Attribute = {
      start: saxparser.startAttribPosition - 1,
      end: saxparser.position,
      name: attr.name,
      value: attr.value,
      nodeType: sax.Type.Attribute
    };

    if (!attr.closed) { attrNode.end--; }
    attribNodes.push(attrNode);
  };

  saxparser.oncomment = function (comment) {
    let CommentNode: sax.Comment = {
      start: saxparser.startCommentPosition - 1,
      end: saxparser.position + 1,
      name: comment,
      nodeType: sax.Type.Comment
    };
    comments.push(CommentNode);
  };

  saxparser.onprocessinginstruction = function (procInst) {
    let processingInstruction: sax.ProcessingInstruction = {
      start: saxparser.startProcInstPosition - 1,
      end: saxparser.position + 1,
      name: procInst.name,
      body: procInst.body,
      nodeType: sax.Type.ProcessingInstruction
    };
    processingInstructions.push(processingInstruction);
  };

  saxparser.onclosetag = function (node) {
    if (object.isSelfClosing) {
      object.endTagStart = object.startTagEnd;
    } else {
      object.endTagStart = saxparser.endTagStart;
    }
    object = object.parent;
  };

  saxparser.oncdata = function (cdata) {
    if (!object) { return; }
    object.text = (object.text || '') + cdata;

    const textNode = {
      start: saxparser.startCDataPosition,
      end: saxparser.startCDataPosition + cdata.length + 12,
      name: cdata,
      nodeType: sax.Type.CData,
    };

    object.textNodes = object.textNodes || [];
    object.textNodes.push(textNode);
  };

  saxparser.ontext = function (text) {
    if (!object || !text) { return; }
    object.text = (object.text || '') + text;

    const textNode = {
      start: saxparser.startTextPosition,
      end: saxparser.startTextPosition + text.length,
      name: text,
      nodeType: sax.Type.Text,
    };
    object.textNodes = object.textNodes || [];
    object.textNodes.push(textNode);
  };
  if (throwError) {
    saxparser.write(xmlString).close();
  } else {
    try {
      saxparser.write(xmlString).end();
    } catch (e) {
      console.log(e);
    } // 如果解析中异常了, 尽可能保留已解析的结果
  }

  if (!object) {
    object = {
      attributes: {},
      name: '',
      start: -1,
      end: -1,
      startTagEnd: -1,
      endTagStart: -1,
      isSelfClosing: false,
      attributeNodes: [],
      text: '',
      namespace: '',
      localName: '',
      error: null,
      errors: []
    };
  }
  // 避免 xml 有节点没正常闭合导致 object 无法在 onclosetag 事件中回到根节点
  if (roots.length < 1) { return; }
  object = roots[0];

  object.comments = comments;
  object.errors = errors;
  object.processingInstructions = processingInstructions;
  object.roots = roots;
  return object;
}
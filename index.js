/**
 * 使用 <br> 来换行
 * 不同浏览器的默认换行不一致，有的是 p，有的是 div
 * @todo IE 插入两个 <br> 后，会空出多一行，一个 <br> 却不换行
 */
export function insertBr() {
  // if (document.queryCommandSupported('defaultParagraphSeparator')) {
  //     document.execCommand('defaultParagraphSeparator', false, 'br');
  // } else {}

  // Chrome 不支持 defaultParagraphSeparator 指令
  // 需要连续插入两个 <br />， 否则光标不会切换到新到一行
  insertHtml("<br /><br />");
}

/**
 * 获取光标
 * @param element
 * @return {Array}
 */
export function getAllRange(element) {
  const selection = window.getSelection();

  let index;
  let RangeCollection = [];

  for (index = 0; index < selection.rangeCount; index++) {
    const range = selection.getRangeAt(index);

    // 如果焦点不在目标元素中，不设置光标
    if (
      !element.contains(range.startContainer) ||
      !element.contains(range.endContainer)
    ) {
      break;
    }

    RangeCollection.push({
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    });
  }

  console.log("[getAllRange]", RangeCollection, selection);

  return RangeCollection;
}

/**
 * 设置光标
 * @param RangeCollection
 * @param element
 */
export function setRange(RangeCollection = [], element) {
  console.log("[setRange]", RangeCollection, element);

  const selection = window.getSelection();
  selection.removeAllRanges();

  // 还原选区
  RangeCollection.forEach(rangeInfo => {
    // 如果焦点不在目标元素中，不设置光标
    if (
      !element.contains(rangeInfo.startContainer) ||
      !element.contains(rangeInfo.endContainer)
    ) {
      return;
    }

    let range = document.createRange();

    range.setStart(rangeInfo.startContainer, rangeInfo.startOffset);
    range.setEnd(rangeInfo.endContainer, rangeInfo.endOffset);

    selection.addRange(range);
  });
}

/**
 * 插入 HTML 字符串
 * @param {*} html
 */
export function insertHtml(html) {
  const COMMAND = "insertHTML";

  if (document.queryCommandSupported(COMMAND)) {
    document.execCommand(COMMAND, false, html);
  } else {
    // IE 不支持 execCommand('inertHTML'), 采用兼容方案
    pasteHtmlAtCaret(html, false);
  }
}

/**
 * 在 光标位置 插入 html 片段
 * IE 不支持 execCommand('inertHTML')
 * https://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div/6691294
 * @param {string} html
 * @param {boolean} [selectPastedContent]
 */
function pasteHtmlAtCaret(html, selectPastedContent) {
  let sel;
  let range;
  if (window.getSelection) {
    // IE9 and non-IE
    sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0);
      range.deleteContents();

      // Range.createContextualFragment() would be useful here but is
      // only relatively recently standardized and is not supported in
      // some browsers (IE9, for one)
      let el = document.createElement("div");
      el.innerHTML = html;
      let frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      let firstNode = frag.firstChild;
      range.insertNode(frag);

      // Preserve the selection
      if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);
        if (selectPastedContent) {
          range.setStartBefore(firstNode);
        } else {
          range.collapse(true);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  } else if ((sel = document.selection) && sel.type !== "Control") {
    // IE < 9
    let originalRange = sel.createRange();
    originalRange.collapse(true);
    sel.createRange().pasteHTML(html);
    if (selectPastedContent) {
      range = sel.createRange();
      range.setEndPoint("StartToStart", originalRange);
      range.select();
    }
  }
}

/**
 * 跨平台 PasteEvent 处理
 * @param {Event} event
 * @param {Function} callback
 */
export function handlePasteEvent(event, callback) {
  // chrome 72+ 的异步黏贴板 API, 最新文档
  const syncClipboardData = navigator.clipboard;
  // 标准事件的黏贴版 API, 旧文档
  const standardClipboardData = event.clipboardData;
  // IE 私有的黏贴版 API, 祖传文档
  const ieClipboardData = window.clipboardData;

  if (syncClipboardData) {
    event.preventDefault();
    syncClipboardData.readText().then(callback);
    return;
  }

  // 优先判断 IE，IE 11 支持 event.clipboardData 和 window.clipboardData
  // 但 IE 11 的 event.clipboardData.getData 的参数只支持 text 而不是 text/plain
  if (ieClipboardData) {
    event.preventDefault();
    Promise.resolve(ieClipboardData.getData("text")).then(callback);
    return;
  }

  if (standardClipboardData) {
    event.preventDefault();
    Promise.resolve(standardClipboardData.getData("text/plain")).then(callback);
    return;
  }

  console.log("当前环境不支持各种 clipboard API, fallback 到默认行为");
}

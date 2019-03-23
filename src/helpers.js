const vscode = require('vscode');
const Prism = require('prismjs');
const languages = require('prism-languages');

/* Used in brackets and quote parsing */
const getParseLanguage = langId => Prism.languages[langId] || Prism.languages['javascript']

/* Used for bracket parsing */
const getLastFromArray = (arr) => arr[arr.length - 1]

const getRangePosition = (selection, pos) => {
    const editor = vscode.window.activeTextEditor;

    return editor.document.getWordRangeAtPosition(selection[pos])
        ? editor.document.getWordRangeAtPosition(selection[pos])[pos]
        : selection[pos]
}

function isBracketToken(tokenType, tokenContent) {
    return tokenType === 'punctuation' && '()[]{}'.indexOf(tokenContent) >= 0
}

/* Used for quotes parsing */
const isStringToken = (token) => token.type === 'template-string' || token.type === 'string'

const tokenAtCursorPos = (token, offset, startOffset, cursorOffset) => {
    // If startOffset + offset is same as cursor - quotes are selected as well and we shouldn't do a quotes swap
    return token.length + offset + startOffset >= cursorOffset &&
        offset + startOffset !== cursorOffset
}

exports.getParseLanguage = getParseLanguage
exports.getLastFromArray = getLastFromArray
exports.getRangePosition = getRangePosition
exports.isStringToken = isStringToken
exports.isBracketToken = isBracketToken
exports.tokenAtCursorPos = tokenAtCursorPos

/* Larger heleprs function */
exports.contentSelection = function contentSelection(startPos, endPos, originalSelection) {
  const {start, end} = originalSelection
  const selStart = new vscode.Position(startPos.line, startPos.character + 1)

  // If current selection is same as new created one we will expand ti include brackets/quotes as well
  if ( start.isEqual(selStart) && end.isEqual(endPos) ) {
      return new vscode.Selection(startPos, new vscode.Position(endPos.line, endPos.character + 1))
  }

  return new vscode.Selection(selStart, endPos)
}

function replaceTokens(selections, target) {
  vscode.window.activeTextEditor.edit(edit => {
      selections.forEach(sel => {
          const { startPos, endPos, tokenType } = sel
          let o
          let e

          if (target !== undefined) {
              if (target.length !== 2 || target.length !== 0 || typeof target !== 'string') {
                  new Error ('Target must be string of length 2 for token replacment or empty string for token deletion')
              }

              if (target.length === 0) {
                  o = ''
                  e = ''
              } else {
                  o = target[0]
                  e = target[1] || target[0]
              }
          } else {
              // TODO: this must be done universaly in order to allow future extensions
              if ('([{'.indexOf(tokenType) >= 0) {
                  o = tokenType === '(' ? '[' : tokenType === '[' ? '{' : '('
                  e = tokenType === '(' ? ']' : tokenType === '[' ? '}' : ')'
              } else {
                  o = tokenType === "'" ? '"' : tokenType === '"' ? '`' : "'"
                  e = o
              }
          }

          edit.replace(charRange(startPos), o)
          edit.replace(charRange(endPos), e)
      })
  })
}

exports.replaceTokens = replaceTokens

// Shamelessly taken from [Quick and Simple Text Selection](https://marketplace.visualstudio.com/items?itemName=dbankier.vscode-quick-select) by David Bankier
function charRange(p) {
  let end_pos = new vscode.Position(p.line, p.character + 1);
  return new vscode.Selection(p, end_pos)
}

exports.charRange = charRange

function getPositionFromOffset(position, offset, before = true) {
  const editor = vscode.window.activeTextEditor;
  const d = editor.document
  const delta = before ? offset : offset * -1

  return d.positionAt(d.offsetAt(position) - delta)
}

exports.getPositionFromOffset = getPositionFromOffset;
import * as monaco from 'monaco-editor';
import { getMainMap } from '~/composables/gisMap';
import * as turf from '@turf/turf';
export const registerProvider = () => {
  const monacoProvider = monaco.languages.registerCompletionItemProvider('json', {
    provideCompletionItems: function (model, position) {
      var word = model.getWordUntilPosition(position);
      var range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      const suggestionMap = new Map<string, string>()
      suggestionMap.set('crs', `"crs":{"type":"name","properties":{"name":"EPSG:4326"}}`);
      const map = getMainMap()
      if (map) {
        const center = map.getCenter();
        if (center) {
          const p =  turf.geometry('Point', [center[0], center[1]])
           turf.buffer(p, 1000)
          console.log()
        }
      } else {
        suggestionMap.set('feature_point', `{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]},"properties":{"name":""}`)
        suggestionMap.set('feature_line', `{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[0,0]]},"properties":{"name":""}`)
        suggestionMap.set('feature_polygon', `{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,0],[0,0],[0,0]]]},"properties":{"name":""}`)
      }
      const suggestions: monaco.languages.CompletionItem[] = [];
      suggestionMap.forEach((val, key, map) => {
        suggestions.push(
          {
            label: key,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: val,
            detail: '',
            range: range,
          },
        );
      })
      return {
        suggestions: suggestions,
      }
    },
  })
  return monacoProvider
}
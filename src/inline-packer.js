/**
  SVG assets packer for `inline` strategy.
  It concatenates inputNode files into a single JSON file like:

  {
    'asset-1-id': { content: '<path>', attrs: { viewBox: '' } },
    'asset-2-id': { content: '<path>', attrs: { viewBox: '' } }
  }

  The result file can optionally include ES6 module export.

  Required options:
    idGen
    stripPath
    outputFile

  Optional:
    moduleExport
    annotation
*/
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const fp = require('lodash/fp');
const CachingWriter = require('broccoli-caching-writer');
const mkdirp = require('mkdirp');
const {
  filePathsOnly, relativePathFor, makeAssetId, svgDataFor
} = require('./utils');

const readFile = _.partial(fs.readFileSync, _, 'UTF-8');
const extractSvgData = fp.pipe(readFile, svgDataFor);

const toJson = _.curry((hasModuleExport, data) => {
  const json = JSON.stringify(data);
  return hasModuleExport ? `export default ${json}` : json;
});

const saveToFile = _.curry((filePath, data) => {
  mkdirp.sync(path.dirname(filePath));
  fs.writeFileSync(filePath, data);
});

class InlinePacker extends CachingWriter {
  constructor(inputNode, options = {}) {
    super([inputNode], {
      name: 'InlinePacker',
      annotation: options.annotation,
    });

    this.options = _.defaults(options, {
      moduleExport: true
    });
  }

  build() {
    const { stripPath, idGen, outputFile, moduleExport } = this.options;
    const inputPath = this.inputPaths[0];
    const outputFilePath = path.join(this.outputPath, outputFile);

    const toRelativePath = _.partial(relativePathFor, _, inputPath);
    const relativePathToId = _.partial(makeAssetId, _, stripPath, idGen);
    const pathToId = fp.pipe(toRelativePath, relativePathToId);

    fp.pipe(
      filePathsOnly,
      fp.map((filePath) => [pathToId(filePath), extractSvgData(filePath)]),
      _.fromPairs,
      toJson(moduleExport),
      saveToFile(outputFilePath)
    )(this.listFiles());
  }
}

module.exports = InlinePacker;

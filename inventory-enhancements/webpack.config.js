const path = require("path");

module.exports = {
  target: "node",
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    main: "./src/bank.ts",
  },
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "inventory-enhancements.js", // <--- Will be compiled to this single file
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
    ],
  },
};

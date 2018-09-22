module.exports = {
  // If we want people to be able to use it without react-testing-library,
  // then we can expose a "render" function which basically does the same
  // as react-testing-library
  // module.exports = component => {
  //   const node = document.createElement("div");
  //   node.id = "test-app";
  //   document.body.appendChild(node);
  //   ReactDOM.render(component, node);
  // }
  // But we should also add the cleanup that react-testing-library does
  //
  // render: require("./src/render"),
  generateImage: require("./generateImage"),
  debug: require("./debug")
};

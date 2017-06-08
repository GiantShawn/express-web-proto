import * as React from "react";
import * as ReactDOM from "react-dom";
import {AppContainer} from 'react-hot-loader';

import Hello from "./components/Hello";

// import html
import './index.html';


ReactDOM.render(
        <AppContainer>
                <Hello compiler='Shawn' framework="React"/>
        </AppContainer>,
        document.getElementById('example')
);

if (module.hot) {
  module.hot.accept("./components/Hello", () => {
          let Hello = require('./components/Hello').default;
          ReactDOM.render(
                  <AppContainer>
                  <Hello compiler='Shawn' framework="React"/>
                  </AppContainer>,
                  document.getElementById('example')
          );
  });
}

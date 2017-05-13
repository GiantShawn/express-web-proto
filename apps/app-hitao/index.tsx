import * as React from "react";
import * as ReactDOM from "react-dom";

import { Hello } from "./components/Hello";
import Hellox from "./components/Hello";

// import html
import './index.html';

console.log(Hellox);

ReactDOM.render(
        <Hello compiler='TypeScript' framework="React"/>,
        document.getElementById('example')
);


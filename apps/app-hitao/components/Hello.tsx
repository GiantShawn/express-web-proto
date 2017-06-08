import * as React from 'react';

export interface HelloProps { compiler: string, framework: string };

//const Hello = (props: HelloProps) =>  <h1>  </h1>;
export const Hello = (props: HelloProps) =>  <div> <h1>Hello Shawn from {props.compiler} and {props.framework}!</h1> <p> Hello kxx </p> </div>;

export default Hello;

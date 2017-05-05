import * as React as 'react';

export interface HelloProps { compiler: string, framework: string };

export const Hello = (prop: HelloProps) =>  <h1>Hello from {props.compiler} and {props.framework}!</h1>;

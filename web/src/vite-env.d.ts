/// <reference types="vite/client" />

// Vite ?worker query — turns any module into a Web Worker constructor
declare module '*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

declare module '*?worker&inline' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

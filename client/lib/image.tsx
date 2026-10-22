import type { ImgHTMLAttributes } from "react";
export default function Image({fill,priority,unoptimized,sizes,style,...props}:ImgHTMLAttributes<HTMLImageElement>&{fill?:boolean;priority?:boolean;unoptimized?:boolean}) {
  return <img {...props} sizes={sizes} loading={priority?"eager":"lazy"} style={{...(fill?{position:"absolute",height:"100%",width:"100%",inset:0} as const:{}),...style}}/>;
}

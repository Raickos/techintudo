export const pageSize=12;
export function paginate(items,page=1){
 const totalPages=Math.max(1,Math.ceil(items.length/pageSize));
 const current=Math.min(totalPages,Math.max(1,Math.trunc(page)||1));
 const start=(current-1)*pageSize;
 return {items:items.slice(start,start+pageSize),page:current,totalPages,start:items.length?start+1:0,end:Math.min(start+pageSize,items.length),total:items.length};
}


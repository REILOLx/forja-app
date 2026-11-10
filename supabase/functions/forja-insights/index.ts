import {createFinancialHandler} from './handler.js';
Deno.serve(createFinancialHandler({getEnv:(name:string)=>Deno.env.get(name)}));

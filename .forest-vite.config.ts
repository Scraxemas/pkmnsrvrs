import {mergeConfig} from 'vite';
import base from './vite.config';
export default mergeConfig(base,{server:{hmr:false,watch:{ignored:['**/docs/qa/**','**/test-results/**','**/dist/**']}}});

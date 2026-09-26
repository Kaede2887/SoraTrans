import './Launcher.css'
import TitleBar from "./components/TitleBar";
import { LauncherView } from './pages/LauncherView';

function Launcher() {

  return (
    <div className="flex flex-col h-screen w-screen " onContextMenu={(e) => e.preventDefault()}>
      <TitleBar className='pl-2 pr-4 h-[30px]' title='SoraTrans'/>
      <main className="flex flex-1 w-screen overflow-y-hidden">
        <LauncherView />
      </main>
    </div>
  );
}

export default Launcher;

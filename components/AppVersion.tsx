import React from 'react';
import packageJson from '../package.json';

const AppVersion: React.FC = () => {
    return (
        <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 tracking-widest uppercase select-none opacity-60 hover:opacity-100 transition-opacity">
            v{packageJson.version}
        </div>
    );
};

export default AppVersion;

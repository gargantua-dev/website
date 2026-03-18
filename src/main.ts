import './styles.css';
import { playerConfig } from './config/playerConfig';
import { getRequiredElement } from './shared/dom';
import { mountVideoPlayer } from './video/player';
import { mediaManifest } from './video/manifest';

const appRoot = getRequiredElement<HTMLDivElement>('#app');

void mountVideoPlayer(appRoot, mediaManifest, playerConfig);

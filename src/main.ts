import './styles.css';
import { playerConfig } from './config/playerConfig';
import { getRequiredElement } from './shared/dom';
import { mountVideoPlayer } from './video/player';
import { mediaManifest } from './video/manifest';

const appRoot = getRequiredElement<HTMLElement>('#app');

void mountVideoPlayer(appRoot, mediaManifest, playerConfig);

import { assetUrl } from './assets/manifest';

// Favicon — жұлдыз asset-і (бір файлдық нұсқада да ішіне енеді)
const href = assetUrl('ui.star');
if (href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = href;
  document.head.appendChild(link);
}

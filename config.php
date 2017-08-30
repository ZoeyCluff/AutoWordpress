<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */


define('WP_HOME','https://zojodesign.com');
define('WP_SITEURL', 'https://zojodesign.com');
// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'test323');

/** MySQL database username */
define('DB_USER', 'test323');

/** MySQL database password */
define('DB_PASSWORD', 'HTy{4cKwG7U');

/** MySQL hostname */
define('DB_HOST', '127.0.0.1');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
 define('AUTH_KEY',         '~4*AWJ{Xm39Q3|AWqHmQBvrAKy.[}bb+$OA.j|LO+S-+p*5E-OE7jF~oWO>$|`<;');
 define('SECURE_AUTH_KEY',  'eC|W5~-#I-@j+DvZ:+3VtaGTM:5A29W4_8Xuqiut6/2e;=_ycHkV.+nw:_U^*-|G');
 define('LOGGED_IN_KEY',    'XWD|rzmz2t=CI+ntWJ4+9Fu4^R}!?niD2YrR-*jwNW(3Jfb(g!l0V-A<>2-9rS?S');
 define('NONCE_KEY',        '&.r!|-O?8BGya~_H^7u^_UY_q}6BsqrD?l!ajmBBC_krCDGQ4z@Bk3|$[uz>h&1t');
 define('AUTH_SALT',        '2ny3cP[Q[!$0A-bkRq=q<dEC+0P;&>5VPz>yY$dtp?!-]r}lLq ^fd5t$WWXK>V_');
 define('SECURE_AUTH_SALT', '!GIaV#&+zs2Yuc 8G~5Bf5JdM|yO$RT~~;9+hxHhZrb~>YIb^h?UWSzz|O]Ybh!G');
 define('LOGGED_IN_SALT',   '{8V;0+vwoq>GfF_0}7+<;|W X>wGT;*ZU,Vs_?2FK&v{3LqcP=<Qus{5Jt*{_V`E');
 define('NONCE_SALT',       '(pF 5yo[6~}R6m^|i7Z{S)XWN+@`MijRT_|&r~CGcYwe@7K+|9,-=l_MRq|wl-W[');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the Codex.
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define('WP_DEBUG', true);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');

# Proto

## `switch`

Proto's `switch` looks like JavaScript's at first glance, but many of the details have been reworked.  Falling through from one `case` to another is *not* the default behavior but can be done with an explicit `continue`.  Since falling through is not the default behavior, `break` is not needed when falling through is undesired.  Here's a comparison of the different features.

	// JavaScript
	switch (foo) {
		case 1:
			bar = 'first';
			break;
		case 2:
			bar = 'second';
			break;
		case 3:
			return 100;
		case 4:
		case 5:
			bar = 'fourth or fifth';
			break;
		default:
			bar = 'undefined';
	}

	// Proto
	switch foo :{
		case 1:
			bar = 'first';
		case 2:
			bar = 'second';
		case 3:
			return 100;
		case 4: continue;
		case 5:
			bar = 'fourth or fifth';
		default:
			bar = 'undefined';
	}
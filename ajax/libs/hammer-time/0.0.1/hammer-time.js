/* Hammer-time - v0.0.0
 * http://github.com/hammerjs/hammer-time
 *
 * Copyright Alexander Schmitz and other contributors
 * Released under the MIT license
 *
 * Expiramental fastclick based on a partial polyfill of
 * touch-action: none; CSS property
 */

( function() {

// If there is native touch action bail the hammer has already dropped
if ( document.documentElement.style[ "touch-action" ] !== undefined ) {
	return;
}

//Check if a global Hammer object already exists
window.Hammer = window.Hammer || {};

// We need to save the last touch start in iOS 8 if it is more then 150ms
// it will trigger native fast click which cant ne stoped even with all the might
// of thors hammer and a return false
var MO = window.MutationObserver || window.WebKitMutationObserver;
var touchMatchNone = /touch-action[:][\s]*none[^;'"]*/;
var touchMatch = /touch-action/;
var iOS = ( navigator.userAgent.match( /(iPad|iPhone|iPod)/g ) ? true : false );
var gl = ( function() {
	try {
		var canvas = document.createElement( "canvas" );
		return !!( window.WebGLRenderingContext && ( canvas.getContext( "webgl" ) ||
			canvas.getContext( "experimental-webgl" ) ) );
	}
	catch ( e ) { return false; } } )();
var timeTouch = gl && iOS;

window.Hammer.time = {

	// Checkes if an element has touch action none in its style attribute and thusly should
	// be hammered upon
	getTouchAction: function( element ) {
		return this.checkStyleString( element.getAttribute( "style" ) );
	},
	checkStyleString: function( style ) {
		if ( !touchMatch.test( style ) ) {
			return undefined;
		}
		if ( touchMatchNone.test( style ) ) {
			return "none";
		}
		return true;
	},
	touchHandler: function( e ) {

		//alert(!timeTouch || Date.now() - e.target.lastStart < 150)
		// Check both if we should trigger fast click and the time to avoid a double trigger with
		// native fast click
		if (  this.getTouchAction( e.target ) === "none" &&
				( !timeTouch || Date.now() - e.target.lastStart < 125 ) ) {
			if ( e.type === "touchend" ) {

				// Create a new click event and dispatch it
				var event = new MouseEvent( "click", {
					"view": window,
					"bubbles": true,
					"cancelable": true
				} );

				// Wait for next tic so events fire in proper order
				setTimeout( function() {
					e.target.dispatchEvent( event );
				}, 0 );
			}

			// Prevent the click which will come after this otherwise but with a 300ms delay
			e.preventDefault();
		}
		delete e.target.lastStart;
	},
	styleWatcher: function( mutations ) {
		mutations.forEach( this.styleUpdater, this );
	},
	styleUpdater: function( mutation ) {

		// We just caused this update bail
		if ( mutation.target.updateNext ) {
			mutation.target.updateNext = false;
			return;
		}

		var touchAction = this.getTouchAction( mutation.target );

		if ( touchAction ) {
			if ( touchAction !== "none" ) {
				mutation.target.hadTouchNone = false;
			}
			return;
		}
		if ( !touchAction &&
				(
					( mutation.oldValue && this.checkStyleString( mutation.oldValue ) ) ||
					mutation.target.hadTouchNone
				)
			) {

			// We save this because durring animations which update the style in quick succession
			// style tag can update quicker then the mutation observer fires so we lose the oldValue
			// property which contains our refrence to the original which contained touch-action.
			mutation.target.hadTouchNone = true;

			// Save the fact that we caused the next update
			mutation.target.updateNext = false;

			// Add touch action back to the style attribute
			mutation.target
				.setAttribute( "style",
					mutation.target.getAttribute( "style" ) + " touch-action: none;"
				);

		}
	},
	install: function() {
		document.addEventListener( "touchend", this.touchHandler.bind( this ), true );
		document.addEventListener( "mouseup", this.touchHandler.bind( this ), true );
		if ( timeTouch ) {
			document.addEventListener( "touchstart", function( e ) {
				if ( this.getTouchAction( e.target ) === "none" ) {
					e.target.lastStart = Date.now();
				}
			}.bind( this ) );
		}

		// We need to observe changes to style attributes because if something updates the style
		// attribute it will remove the touch-action property because browsers santitize the style
		// attribute when its properties are updated.
		this.observer = new MO( this.styleWatcher.bind( this ) ).observe( document, {
			subtree: true,
			attributes: true,
			attributeOldValue: true,
			attributeFilter: [ "style" ]
		} );
	}
};

window.Hammer.time.install();

} )();

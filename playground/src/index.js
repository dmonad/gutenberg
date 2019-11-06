/**
 * WordPress dependencies
 */
import '@wordpress/editor'; // This shouldn't be necessary

import { render, useState, useEffect, Fragment } from '@wordpress/element';
import {
	BlockEditorKeyboardShortcuts,
	BlockEditorProvider,
	BlockList,
	WritingFlow,
	ObserveTyping,
} from '@wordpress/block-editor';
import {
	Popover,
	SlotFillProvider,
	DropZoneProvider,
} from '@wordpress/components';
import { registerCoreBlocks } from '@wordpress/block-library';
import '@wordpress/format-library';

/**
 * Internal dependencies
 */
import './style.scss';

/* eslint-disable no-restricted-syntax */
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/block-library/build-style/style.css';
import '@wordpress/block-library/build-style/editor.css';
import '@wordpress/block-library/build-style/theme.css';
import '@wordpress/format-library/build-style/style.css';
/* eslint-enable no-restricted-syntax */

/**
 * External dependencies
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import _ from 'lodash';

// ydoc is the CRDT state
const ydoc = new Y.Doc();
// Connect ydoc to other clients via the Websocket provider.
const provider = new WebsocketProvider( `${ window.location.protocol === 'http:' ? 'ws:' : 'wss:' }//yjs-demos.now.sh`, 'gutenberg', ydoc );
// Define a shared type on ydoc.
// A shared type works like any other data type - but it fires synchronous
// events when it changes and is automatically synced with other clients.
const yContent = ydoc.getArray( 'gutenberg-content' );

window.debugY = {
	ydoc, provider, yContent,
};

/**
 * Create a diff between two editor states.
 *
 * @template T
 * @param {Array<T>} a The old state
 * @param {Array<T>} b The updated state
 * @return {{index:number,remove:number,insert:Array<T>}} The diff description.
 */
const simpleDiff = ( a, b ) => {
	let left = 0; // number of same characters counting from left
	let right = 0; // number of same characters counting from right
	while ( left < a.length && left < b.length && _.isEqual( a[ left ], b[ left ] ) ) {
		left++;
	}
	if ( left !== a.length || left !== b.length ) {
		// Only check right if a !== b
		while ( right + left < a.length && right + left < b.length && _.isEqual( a[ a.length - right - 1 ], b[ b.length - right - 1 ] ) ) {
			right++;
		}
	}
	return {
		index: left,
		remove: a.length - left - right,
		insert: b.slice( left, b.length - right ),
	};
};

function App() {
	const [ blocks, updateBlocks ] = useState( yContent.toArray() );
	useEffect( () => {
		// Register type observer
		const observer = ( ) => {
			// update react state
			updateBlocks( yContent.toArray() );
		};
		yContent.observeDeep( observer );
		return () => {
			yContent.unobserveDeep( observer );
		};
	} );
	const updateYjsType = ( newEditorContent ) => {
		// Use a very basic diff approach to calculate the differences
		const currentContent = yContent.toArray();
		const d = simpleDiff( currentContent, newEditorContent );
		// Bundle all changes as a single transaction
		// This transaction will trigger the observer call, which will
		// trigger updateBlocks.
		ydoc.transact( () => {
			yContent.delete( d.index, d.remove );
			yContent.insert( d.index, d.insert );
		} );
	};

	return (
		<Fragment>
			<div className="playground__header">
				<h1 className="playground__logo">Gutenberg Playground</h1>
			</div>
			<div className="playground__body">
				<SlotFillProvider>
					<DropZoneProvider>
						<BlockEditorProvider
							value={ blocks }
							onInput={ updateYjsType }
							onChange={ updateYjsType }
						>
							<div className="editor-styles-wrapper">
								<BlockEditorKeyboardShortcuts />
								<WritingFlow>
									<ObserveTyping>
										<BlockList />
									</ObserveTyping>
								</WritingFlow>
							</div>
							<Popover.Slot />
						</BlockEditorProvider>
					</DropZoneProvider>
				</SlotFillProvider>
			</div>
		</Fragment>
	);
}

registerCoreBlocks();
render(
	<App />,
	document.querySelector( '#app' )
);

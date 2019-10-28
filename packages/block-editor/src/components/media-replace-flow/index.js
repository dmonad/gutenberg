/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	FormFileUpload,
	NavigableMenu,
	MenuItem,
	Toolbar,
	Button,
	Popover,
	withNotices,
} from '@wordpress/components';
import {
	LEFT,
	RIGHT,
	UP,
	DOWN,
	BACKSPACE,
	ENTER,
} from '@wordpress/keycodes';
import { withSelect } from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import BlockControls from '../block-controls';
import MediaUpload from '../media-upload';
import MediaUploadCheck from '../media-upload/check';
import LinkEditor from '../url-popover/link-editor';
import LinkViewer from '../url-popover/link-viewer';

const MediaReplaceFlow = (
	{
		mediaUpload,
		mediaURL,
		allowedTypes,
		onSelect,
		onSelectURL,
		noticeOperations,
		name = __( 'Replace' ),
		multiple = false,
	}
) => {
	const [ showURLInput, setShowURLInput ] = useState( false );
	const [ showEditURLInput, setShowEditURLInput ] = useState( false );
	const [ mediaURLValue, setMediaURLValue ] = useState( mediaURL );
	const [ showMediaReplaceOptions, setShowMediaReplaceOptions ] = useState( false );

	const stopPropagation = ( event ) => {
		event.stopPropagation();
	};

	const stopPropagationRelevantKeys = ( event ) => {
		if ( [ LEFT, DOWN, RIGHT, UP, BACKSPACE, ENTER ].indexOf( event.keyCode ) > -1 ) {
			// Stop the key event from propagating up to ObserveTyping.startTypingInTextField.
			event.stopPropagation();
		}
	};

	const selectMedia = ( media ) => {
		onSelect( media );
		setMediaURLValue( media.url );
	};

	const onUploadError = ( message ) => {
		noticeOperations.removeAllNotices();
		noticeOperations.createErrorNotice( message );
	};

	const uploadFiles = ( event ) => {
		const files = event.target.files;
		let setMedia;
		if ( multiple ) {
			setMedia = selectMedia;
		} else {
			setMedia = ( [ media ] ) => {
				setShowMediaReplaceOptions( false );
				selectMedia( media );
			};
		}
		mediaUpload( {
			allowedTypes,
			filesList: files,
			onFileChange: setMedia,
			onUploadError,
		} );
	};

	const fileUploadButton = (
		<FormFileUpload
			onChange={ uploadFiles }
			accept={ allowedTypes }
			multiple={ multiple }
			render={ ( { openFileDialog } ) => {
				return (
					<MenuItem
						icon="upload"
						onClick={ openFileDialog }
					>
						{ __( 'Upload' ) }
					</MenuItem>
				);
			} }
		/>
	);

	const URLButton = (
		<MenuItem
			icon="admin-links"
			onClick={ () => ( setShowURLInput( ! showURLInput ) ) }
		>
			<div> { __( 'Insert from URL' ) } </div>
		</MenuItem>
	);

	let urlInputUIContent;
	if ( showEditURLInput ) {
		urlInputUIContent = ( <LinkEditor
			onKeyDown={ stopPropagationRelevantKeys }
			onKeyPress={ stopPropagation }
			value={ mediaURLValue }
			isFullWidthInput={ true }
			hasInputBorder={ true }
			onChangeInputValue={ ( url ) => ( setMediaURLValue( url ) ) }
			onSubmit={ ( event ) => {
				event.preventDefault();
				onSelectURL( mediaURLValue );
				setShowEditURLInput( ! showEditURLInput );
			} }
		/> );
	} else {
		urlInputUIContent = ( <LinkViewer
			isFullWidth={ true }
			className="editor-format-toolbar__link-container-content block-editor-format-toolbar__link-container-content"
			url={ mediaURLValue }
			onEditLinkClick={ () => ( setShowEditURLInput( ! showEditURLInput ) ) }
		/> );
	}

	const urlInputUI = ( showURLInput && <div className="block-editor-media-flow__url-input">
		{ urlInputUIContent }
	</div> );

	const onClickOutside = () => {
		return ( ) => {
			setShowMediaReplaceOptions( false );
		};
	};

	const editMediaButton = (
		<BlockControls>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) => selectMedia( media ) }
					onClose={ () => setShowMediaReplaceOptions( false ) }
					allowedTypes={ allowedTypes }
					render={ ( { open } ) => (
						<>
							<Toolbar className={ 'components-dropdown-menu components-toolbar' }>
								<Button
									className={ 'components-button components-icon-button components-dropdown-menu__toggle' }
									onClick={ () => {
										setShowMediaReplaceOptions( ! showMediaReplaceOptions );
									} }
								>
									<span className="components-dropdown-menu__label" > { name } </span>
									<span className="components-dropdown-menu__indicator" />
								</Button>
								{ showMediaReplaceOptions &&
									<Popover
										onClickOutside={ onClickOutside() }
									>
										<>
											<NavigableMenu>
												<MenuItem
													icon="admin-media"
													onClick={ open }
												>
													{ __( 'Open Media Library' ) }
												</MenuItem>
												{ fileUploadButton }
												{ URLButton }
											</NavigableMenu>
											{ urlInputUI }
										</>
									</Popover>
								}
							</Toolbar>
						</>
					) }
				/>
			</MediaUploadCheck>
		</BlockControls>
	);

	return (
		<>
			{ editMediaButton }
		</>
	);
};

const applyWithSelect = withSelect( ( select ) => {
	const { getSettings } = select( 'core/block-editor' );

	return {
		mediaUpload: getSettings().__experimentalMediaUpload,
	};
} );

/**
 * @see https://github.com/WordPress/gutenberg/blob/master/packages/block-editor/src/components/media-placeholder/README.md
 */
export default compose(
	applyWithSelect,
	withNotices,
)( MediaReplaceFlow );

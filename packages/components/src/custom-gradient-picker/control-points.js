
/**
 * External dependencies
 */
import { map, some } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useCallback, useRef, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Button from '../button';
import ColorPicker from '../color-picker';
import Dropdown from '../dropdown';
import { serializeGradientColor, serializeGradientPosition } from './serializer';
import { getHorizontalRelativeGradientPosition, getGradientWithColorAtIndexChanged, getGradientWithPositionAtIndexChanged, getGradientWithControlPointRemoved } from './utils';
import {
	GRADIENT_MARKERS_WIDTH,
	MINIMUM_DISTANCE_BETWEEN_POINTS,
	MINIMUM_SIGNIFICANT_MOVE,
	COLOR_POPOVER_PROPS,
} from './constants';

export function useMarkerPoints( parsedGradient, maximumAbsolutePositionValue ) {
	return useMemo(
		() => {
			if ( ! parsedGradient ) {
				return [];
			}
			return map( parsedGradient.colorStops, ( colorStop ) => {
				if ( ! colorStop || ! colorStop.length || colorStop.length.type !== '%' ) {
					return null;
				}
				return {
					color: serializeGradientColor( colorStop ),
					position: serializeGradientPosition( colorStop.length ),
					positionValue: parseInt( colorStop.length.value ),
				};
			} );
		},
		[ parsedGradient, maximumAbsolutePositionValue ]
	);
}

export function ControlPoints( {
	gradientPickerDomRef,
	ignoreMarkerPosition,
	markerPoints,
	onChange,
	parsedGradient,
	setIsInsertPointMoveEnabled,
} ) {
	const controlPointMoveState = useRef();
	const controlPointMove = useCallback(
		( event ) => {
			const relativePosition = getHorizontalRelativeGradientPosition(
				event.clientX,
				gradientPickerDomRef.current,
				GRADIENT_MARKERS_WIDTH,
			);
			const { parsedGradient: referenceParsedGradient, position, significantMoveHappened } = controlPointMoveState.current;
			if ( ! significantMoveHappened ) {
				const initialPosition = referenceParsedGradient.colorStops[ position ].length.value;
				if ( Math.abs( initialPosition - relativePosition ) >= MINIMUM_SIGNIFICANT_MOVE ) {
					controlPointMoveState.current.significantMoveHappened = true;
				}
			}
			onChange(
				getGradientWithPositionAtIndexChanged( referenceParsedGradient, position, relativePosition )
			);
		},
		[ controlPointMoveState, onChange, gradientPickerDomRef ]
	);

	const onMouseUp = useCallback(
		( event ) => {
			const { parsedGradient: referenceParsedGradient, position } = controlPointMoveState.current;
			const colorStopPosition = getHorizontalRelativeGradientPosition(
				event.clientX,
				gradientPickerDomRef.current,
				GRADIENT_MARKERS_WIDTH,
			);
			// Reset the move if the control point gets very close to another existing control point.
			if ( some(
				parsedGradient.colorStops,
				( { length }, index ) => {
					return index !== position && Math.abs( length.value - colorStopPosition ) < MINIMUM_DISTANCE_BETWEEN_POINTS;
				}
			) ) {
				onChange( referenceParsedGradient );
			}
			if ( window && window.removeEventListener ) {
				window.removeEventListener( 'mousemove', controlPointMove );
				window.removeEventListener( 'mouseup', onMouseUp );
			}
		},
		[ controlPointMove, onChange, controlPointMoveState ]
	);

	const controlPointMouseDown = useMemo(
		() => {
			return parsedGradient.colorStops.map(
				( colorStop, index ) => () => {
					if ( window && window.addEventListener ) {
						controlPointMoveState.current = {
							parsedGradient,
							position: index,
							significantMoveHappened: false,
						};
						window.addEventListener( 'mousemove', controlPointMove );
						window.addEventListener( 'mouseup', onMouseUp );
					}
				}
			);
		},
		[ parsedGradient, controlPointMove, onMouseUp, controlPointMoveState ]
	);

	const enableInsertPointMove = useCallback(
		() => {
			setIsInsertPointMoveEnabled( true );
		},
		[ setIsInsertPointMoveEnabled ]
	);

	return markerPoints.map(
		( point, index ) => (
			point && ignoreMarkerPosition !== point.positionValue && (
				<Dropdown
					key={ index }
					onClose={ enableInsertPointMove }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							onClick={ () => {
								if ( controlPointMoveState.current.significantMoveHappened ) {
									return;
								}
								onToggle();
								setIsInsertPointMoveEnabled( false );
							} }
							onMouseDown={ controlPointMouseDown[ index ] }
							aria-expanded={ isOpen }
							className={
								classnames(
									'components-custom-gradient-picker__marker-point',
									{ 'is-active': isOpen }
								)
							}
							style={ {
								left: point.position,
							} }
						/>
					) }
					renderContent={ () => (
						<>
							<ColorPicker
								color={ point.color }
								onChangeComplete={ ( { rgb } ) => {
									onChange(
										getGradientWithColorAtIndexChanged( parsedGradient, index, rgb )
									);
								} }
							/>
							<Button
								className="components-custom-gradient-picker__remove-control-point"
								onClick={ () => {
									onChange(
										getGradientWithControlPointRemoved( parsedGradient, index )
									);
									setIsInsertPointMoveEnabled( true );
								} }
								isLink
							>
								{ __( 'Remove Control Point' ) }
							</Button>
						</>
					) }
					popoverProps={ COLOR_POPOVER_PROPS }
				/>
			)
		)
	);
}

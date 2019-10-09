/**
 * @fileoverview Select from contacts mobile view
 * @author Gabriel Womble
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Visible } from '@codeparticle/react-visible';
import { IconButton, TextInput, svgs } from '@codeparticle/whitelabelwallet.styleguide';
import { empty } from 'lib/utils';

import { setToAddress } from 'plugins/send-funds/rdx/actions';
import { getToAddress } from 'plugins/send-funds/rdx/selectors';
import { MobileFormButton, SelectContacts } from 'plugins/send-funds/components';
import { constants } from 'plugins/send-funds/helpers';
import { SEND_FUNDS } from 'plugins/send-funds/translations/keys';
import './select-from-contacts.scss';

const { SELECTING_CONTACTS } = constants;
const iconSize = 20;
const { SvgQrCode } = svgs.icons;
const {
  ENTER_ADDRESS,
  SELECT_FROM_CONTACTS,
  SEND_TO,
} = SEND_FUNDS;

function SelectFromContactsView({
  formatMessage,
  onInputChange,
  inputValue,
  setFormSelecting,
  ...props
}) {
  const [isSelecting, setIsSelecting] = useState(false);

  function onClick() {
    setIsSelecting(true);
    setFormSelecting(SELECTING_CONTACTS);
  }

  return (
    <Visible
      when={!isSelecting}
      fallback={
        <SelectContacts
          formatMessage={formatMessage}
          setFormSelecting={setFormSelecting}
          setToAddress={props.setToAddress}
          setIsSelecting={setIsSelecting}
        />
      }
    >
      <MobileFormButton
        btnLabel={formatMessage(SELECT_FROM_CONTACTS)}
        label={formatMessage(SEND_TO)}
        onClick={onClick}
        input={
          <div className="select-from-contacts-input">
            <TextInput
              placeholder={formatMessage(ENTER_ADDRESS)}
              onChange={onInputChange}
              value={inputValue}
            />
            <IconButton
              icon={<SvgQrCode height={iconSize} width={iconSize} />}
              onClick={empty}
            />
          </div>
        }
      />
    </Visible>
  );
}

SelectFromContactsView.propTypes = {
  formatMessage: PropTypes.func.isRequired,
  inputValue: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  setFormSelecting: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
  const toAddress = getToAddress(state);

  return {
    toAddress,
  };
};

const mapDispatchToProps = {
  setToAddress,
};

export const SelectFromContacts = connect(mapStateToProps, mapDispatchToProps)(SelectFromContactsView);

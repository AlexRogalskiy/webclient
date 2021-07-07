import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';

import { AppState, AutocryptEncryptDetermine, BlackList, Contact, WhiteList } from '../../../../store/datatypes';
import { Mailbox } from '../../../../store/models';
import { SharedService } from '../../../../store/services';
import { BlackListAdd, MoveToBlacklist, MoveToWhitelist } from '../../../../store/actions';

@Component({
  selector: 'app-receiver-email-chip',
  templateUrl: './receiver-email-chip.component.html',
  styleUrls: ['./receiver-email-chip.component.scss'],
})
export class ReceiverEmailChipComponent {
  @ViewChild('addUserContent') addUserContent: any;

  @Input() composePopover = true;

  @Input() email: string;

  @Input() name = '';

  @Input() contacts: Contact[];

  @Input() isContactEncrypted: boolean;

  @Input() mailboxes: Mailbox[] = [];

  @Input() blacklist: BlackList[] = [];

  @Input() whitelist: WhiteList[] = [];

  @Input() autocryptInfo: AutocryptEncryptDetermine;

  @Input() isAutocrypt?: boolean;

  @Input() isAutocryptEncrypt?: boolean;

  @Input() encryptionTypeMap: any;

  selectedContact: Contact;

  isMyMailbox = false;

  isValidEmail = true;

  myDisplayName: string;

  /**
   * This contact will be transferred to save contact component
   */
  passingContact: Contact;

  isBlacklisted = false;

  isWhitelisted = false;

  constructor(private modalService: NgbModal, private sharedService: SharedService, private store: Store<AppState>) {}

  ngOnChanges(): void {
    this.selectedContact = this.contacts.find(contact => this.email === contact.email);
    if (!this.composePopover && this.mailboxes.length > 0) {
      for (const mailbox of this.mailboxes) {
        if (mailbox.email === this.email) {
          this.isMyMailbox = true;
          this.myDisplayName = mailbox.display_name ? mailbox.display_name : this.email;
        }
      }
    }
    this.isValidEmail = this.sharedService.isRFCStandardValidEmail(this.email);
    this.isBlacklisted = false;
    this.isWhitelisted = false;
    if (this.blacklist.length > 0) {
      this.isBlacklisted = this.blacklist.some(blacklistItem => blacklistItem.email === this.email);
    }
    if (this.whitelist.length > 0) {
      this.isWhitelisted = this.whitelist.some(whitelistItem => whitelistItem.email === this.email);
    }
  }

  onAddContact(popOver: any, addUserContent: TemplateRef<any>) {
    this.passingContact = {
      email: this.email,
      name: this.email,
    };
    this.modalService.open(addUserContent, {
      centered: true,
      windowClass: 'modal-sm users-action-modal',
      beforeDismiss: () => {
        return true;
      },
    });
  }

  onEditContact(popOver: any, addUserContent: TemplateRef<any>) {
    this.passingContact = this.selectedContact;
    this.modalService.open(addUserContent, {
      centered: true,
      windowClass: 'modal-sm users-action-modal',
      beforeDismiss: () => {
        return true;
      },
    });
  }

  onAddBlacklist() {
    this.store.dispatch(
      new BlackListAdd({ email: this.email, name: this.name ? this.name : this.email.split('@')[0] }),
    );
  }

  onMoveBlacklist() {
    const whitelistedItem = this.whitelist.find(item => item.email === this.email);
    if (whitelistedItem) {
      this.store.dispatch(
        new MoveToBlacklist({ id: whitelistedItem.id, name: whitelistedItem.name, email: whitelistedItem.email }),
      );
    }
  }

  onMoveWhitelist() {
    const blacklistedItem = this.blacklist.find(item => item.email === this.email);
    if (blacklistedItem) {
      this.store.dispatch(
        new MoveToWhitelist({ id: blacklistedItem.id, name: blacklistedItem.name, email: blacklistedItem.email }),
      );
    }
  }

  onClickBody(popOver: any) {
    if (popOver.isOpen()) {
      popOver.close();
    } else {
      popOver.open();
    }
  }
}

import { TableColumn } from '@backstage/core-components';
import { Entity, parseEntityRef } from '@backstage/catalog-model';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { Typography } from '@material-ui/core';
import React from 'react';
import { DataOwnerEntity } from '../../hooks/useDataOwners';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const getDisplayName = (entity?: Entity): string | undefined => {
  if (!entity) return undefined;
  const profile = asRecord(entity.spec?.profile);
  return (
    getString(entity.metadata.title) ??
    getString(profile.displayName) ??
    entity.metadata.name
  );
};

const referenceLabel = (
  ref: unknown,
  entitiesByRef: Map<string, Entity>,
): string | undefined => {
  if (typeof ref !== 'string' || !ref) return undefined;
  const entity = entitiesByRef.get(ref);
  if (entity) return getDisplayName(entity);
  try {
    return parseEntityRef(ref).name;
  } catch {
    return ref;
  }
};

const renderEntityReference = (
  ref: string,
  entitiesByRef: Map<string, Entity>,
) => {
  const entity = entitiesByRef.get(ref);
  return entity ? (
    <EntityRefLink entityRef={entity} />
  ) : (
    referenceLabel(ref, entitiesByRef)
  );
};

const formatDatabaseUsers = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return '—';
  return (
    <>
      {value.map((rawUser, index) => {
        const user = asRecord(rawUser);
        const platform = getString(user.platform) ?? '—';
        const name = getString(user.name) ?? '—';
        const description = getString(user.description);
        return (
          <React.Fragment key={`${platform}-${name}-${index}`}>
            <Typography variant="body2">
              {platform}: {name}
            </Typography>
            {description && (
              <Typography variant="caption">
                {description}
              </Typography>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const useDataOwnerTableColumns = (
  groupsByRef: Map<string, Entity>,
  usersByRef: Map<string, Entity>,
): TableColumn<DataOwnerEntity>[] => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  return [
    {
      title: t('dataOwnerTable.name'),
      field: 'metadata.title',
      highlight: true,
      render: owner =>
        <EntityRefLink entityRef={owner}>
          {getDisplayName(owner) ?? owner.metadata.name}
        </EntityRefLink>,
    },
    {
      title: t('dataOwnerTable.description'),
      field: 'metadata.description',
      render: owner => owner.metadata.description ?? '—',
    },
    {
      title: t('dataOwnerTable.organization'),
      field: 'spec.organisationName',
      render: owner => {
        const email = getString(owner.spec.profile?.email);
        return (
          <>
            <Typography variant="body2">{owner.spec.organisationName ?? '—'}</Typography>
            {email && <Typography variant="caption">{email}</Typography>}
          </>
        );
      },
    },
    {
      title: t('dataOwnerTable.organisationHierarchy'),
      field: 'spec.administration',
      render: owner => {
        const refs = [owner.spec.administration, owner.spec.department, owner.spec.unit]
          .filter((ref): ref is string => typeof ref === 'string' && ref.length > 0);
        return refs.length > 0
          ? refs.map((ref, index) => (
              <React.Fragment key={ref}>
                {index > 0 && ' / '}
                {renderEntityReference(ref, groupsByRef)}
              </React.Fragment>
            ))
          : '—';
      },
    },
    {
      title: t('dataOwnerTable.databaseUsers'),
      field: 'spec.databaseUsers',
      sorting: false,
      render: owner => formatDatabaseUsers(owner.spec.databaseUsers),
    },
    {
      title: t('dataOwnerTable.responsible'),
      field: 'spec.responsible',
      render: owner => {
        const ref = getString(owner.spec.responsible);
        if (!ref) return '—';
        const user = usersByRef.get(ref);
        const profile = asRecord(user?.spec?.profile);
        const displayName = getDisplayName(user) ?? referenceLabel(ref, usersByRef);
        const email = getString(profile.email);
        return (
          <>
            {user ? (
              <EntityRefLink entityRef={user}>{displayName}</EntityRefLink>
            ) : (
              <Typography variant="body2">{displayName}</Typography>
            )}
            {email && <Typography variant="caption">{email}</Typography>}
          </>
        );
      },
    },
    {
      title: t('dataOwnerTable.status'),
      field: 'spec.status',
      render: owner => owner.spec.status ?? '—',
    },
    {
      title: t('dataOwnerTable.reminders'),
      field: 'spec.receiveReminders',
      render: owner =>
        owner.spec.receiveReminders
          ? t('dataOwnerTable.yes')
          : t('dataOwnerTable.no'),
    },
    {
      title: t('dataOwnerTable.agreementHistory'),
      field: 'spec.managementAgreementHistory',
      render: owner => {
        const count = owner.spec.managementAgreementHistory?.length ?? 0;
        return count === 0
          ? t('dataOwnerTable.noHistory')
          : t('dataOwnerTable.historyCount', { count });
      },
    },
  ];
};
